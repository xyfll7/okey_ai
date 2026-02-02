use crate::my_api::manager::APIManager;
use crate::my_api::traits::ChatCompletionRequest;
use crate::states::app_config::ModelProvider;
use crate::states::app_state::AppConfigState;
use crate::states::chat_histories::ChatHistoriesState;
use crate::utils::chat_message::{ChatMessage, ChatMessageHistory};
use std::collections::BTreeMap;
use std::future::Future;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::async_runtime::RwLock;
#[derive(Clone)]
pub struct TranslationManager {
    chat_histories: ChatHistoriesState,
    active_session_id: Arc<RwLock<Option<String>>>,
    api_manager: Arc<RwLock<APIManager>>,
    app_config_state: AppConfigState,
}

impl TranslationManager {
    pub fn new(
        chat_histories: &ChatHistoriesState,
        api_manager: Arc<RwLock<APIManager>>,
        app_config_state: AppConfigState,
    ) -> Self {
        Self {
            chat_histories: chat_histories.clone(),
            active_session_id: Arc::new(RwLock::new(None)),
            api_manager,
            app_config_state,
        }
    }

    pub async fn create_session(&self) -> String {
        let session_id = format!(
            "translate_{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis()
        );

        self.chat_histories
            .add_system_message(
                &session_id,
                "You are a professional translation assistant. Please accurately translate the language, preserving the original meaning and tone.".to_string(),
                None,
            )
            .await;

        let mut active_id = self.active_session_id.write().await;
        *active_id = Some(session_id.clone());

        session_id
    }

    async fn get_current_model_type(&self) -> ModelProvider {
        let app_config_read = self.app_config_state.read();
        let model_type = app_config_read.current_model.clone();
        drop(app_config_read); // Explicitly drop the read guard
        model_type
    }

    pub async fn prepare_session_and_add_message(
        &self,
        session_id: Option<&str>,
        content: &str,
        raw: Option<String>,
    ) -> Option<(String, Vec<ChatMessage>)> {
        let session_id = match session_id {
            Some(id) => id.to_string(),
            None => {
                let active_id = self.active_session_id.read().await;
                active_id.as_ref()?.clone()
            }
        };

        self.chat_histories
            .add_user_message(&session_id, content.to_string(), raw)
            .await;

        let messages = self.chat_histories.get_messages(&session_id).await?;
        Some((session_id, messages))
    }

    pub async fn translate<F, Fut>(
        &self,
        session_id: Option<&str>,
        content: &str,
        raw: Option<String>,
        callback: F,
    ) -> Option<Vec<ChatMessage>>
    where
        F: FnOnce(Vec<ChatMessage>) -> Fut,
        Fut: Future<Output = ()> + Send + 'static,
    {
        let session_id = match session_id {
            Some(id) => id.to_string(),
            None => {
                let active_id = self.active_session_id.read().await;
                active_id.as_ref()?.clone()
            }
        };

        let messages = self.chat_histories.get_messages(&session_id).await?;
        callback(messages.clone()).await;

        let model_type = self.get_current_model_type().await;

        let manager = self.api_manager.read().await;
        let current_client_config = manager.get_current_client_config(&model_type).await;
        let model_specific_params = manager.get_current_model_request_params(&model_type).await;

        let request = ChatCompletionRequest {
            model: current_client_config.model,
            messages: messages.iter().map(ChatMessage::as_llm).collect::<Vec<_>>(),
            temperature: Some(0.1),
            max_tokens: Some(1500),
            top_p: Some(1.0),
            stream: Some(false),
            extra_params: model_specific_params,
        };
        let response = manager.chat_completion(&request, &model_type).await.ok()?;

        let content = response.choices.first()?.message.content.clone();

        self.chat_histories
            .add_assistant_message(&session_id, content.clone(), None)
            .await;

        self.chat_histories.get_messages(&session_id).await
    }

    pub async fn translate_stream<F, Fut, StreamCallback>(
        &self,
        session_id: Option<&str>,
        content: &str,
        raw: Option<String>,
        initial_callback: F,
        stream_callback: StreamCallback,
    ) -> Option<Vec<ChatMessage>>
    where
        F: FnOnce(Vec<ChatMessage>) -> Fut,
        Fut: Future<Output = ()> + Send + 'static,
        StreamCallback: Fn(String) + Send + 'static,
    {
        let session_id = match session_id {
            Some(id) => id.to_string(),
            None => {
                let active_id = self.active_session_id.read().await;
                active_id.as_ref()?.clone()
            }
        };

        let messages = self.chat_histories.get_messages(&session_id).await?;

        initial_callback(messages.clone()).await;

        let model_type = self.get_current_model_type().await;

        let manager = self.api_manager.read().await;
        let current_client_config = manager.get_current_client_config(&model_type).await;
        let model_specific_params = manager.get_current_model_request_params(&model_type).await;

        let request = ChatCompletionRequest {
            model: current_client_config.model,
            messages: messages.iter().map(ChatMessage::as_llm).collect::<Vec<_>>(),
            temperature: Some(0.1),
            max_tokens: Some(5000),
            top_p: Some(1.0),
            stream: Some(true),
            extra_params: model_specific_params,
        };
        let content_chunks = Arc::new(std::sync::Mutex::new(String::new()));
        let content_chunks_clone = content_chunks.clone();
        let result = manager
            .chat_completion_stream(&request, &model_type, move |chunk| {
                for choice in &chunk.choices {
                    if let Some(ref content) = choice.delta.content {
                        stream_callback(content.clone());
                        // Collect the content chunks
                        let mut chunks = content_chunks_clone.lock().unwrap();
                        *chunks += content;
                    }
                }
            })
            .await;

        if result.is_err() {
            return None;
        }
        let final_content = content_chunks.lock().unwrap().clone();
        self.chat_histories
            .add_assistant_message(&session_id, final_content, None)
            .await;
        self.chat_histories.get_messages(&session_id).await
    }

    pub async fn get_histories(&self) -> BTreeMap<String, ChatMessageHistory> {
        self.chat_histories.clone().get_all_histories().await
    }

    pub async fn get_current_history(&self) -> Option<Vec<ChatMessage>> {
        let active_id = self.active_session_id.read().await;
        let session_id = active_id.as_ref()?;
        self.chat_histories.get_messages(session_id).await
    }
}
