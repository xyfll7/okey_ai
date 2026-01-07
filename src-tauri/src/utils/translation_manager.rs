use crate::my_api::manager::APIManager;
use crate::my_api::traits::ChatCompletionRequest;
use crate::states::chat_histories::ChatHistoriesState;
use crate::utils::chat_message::ChatMessage;
use std::future::Future;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::async_runtime::RwLock;
#[derive(Clone)]
pub struct TranslationManager {
    chat_histories: ChatHistoriesState,
    active_session_id: Arc<RwLock<Option<String>>>,
    api_manager: Arc<RwLock<APIManager>>,
}

impl TranslationManager {
    pub fn new(chat_histories: &ChatHistoriesState, api_manager: Arc<RwLock<APIManager>>) -> Self {
        Self {
            chat_histories: chat_histories.clone(),
            active_session_id: Arc::new(RwLock::new(None)),
            api_manager,
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
                "你是一个专业的翻译助手。请准确地进行语言翻译，保持原文的含义和语气。".to_string(),
                None,
            )
            .await;

        let mut active_id = self.active_session_id.write().await;
        *active_id = Some(session_id.clone());

        session_id
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
        // 确定要使用的会话ID
        let session_id = match session_id {
            Some(id) => id.to_string(),
            None => {
                let active_id = self.active_session_id.read().await;
                active_id.as_ref()?.clone()
            }
        };

        // 添加用户消息
        self.chat_histories
            .add_user_message(&session_id, content.to_string(), raw)
            .await;

        // 获取历史
        let messages = self.chat_histories.get_messages(&session_id).await?;

        // 调用回调函数
        callback(messages.clone()).await;

        // 构建 API 请求
        let request = ChatCompletionRequest {
            model: "qwen-plus".to_string(),
            messages: messages.iter().map(ChatMessage::as_llm).collect::<Vec<_>>(),
            temperature: Some(0.1),
            max_tokens: Some(500),
            top_p: Some(1.0),
            stream: Some(false), // Non-streaming request
        };

        // 调用 AI API
        let manager = self.api_manager.read().await;
        let response = manager.chat_completion(&request).await.ok()?;

        // 提取响应内容
        let content = response.choices.first()?.message.content.clone();

        // 保存助手回复
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
        // 确定要使用的会话ID
        let session_id = match session_id {
            Some(id) => id.to_string(),
            None => {
                let active_id = self.active_session_id.read().await;
                active_id.as_ref()?.clone()
            }
        };

        // 添加用户消息
        self.chat_histories
            .add_user_message(&session_id, content.to_string(), raw)
            .await;

        // 获取历史
        let messages = self.chat_histories.get_messages(&session_id).await?;

        // 调用初始回调函数
        initial_callback(messages.clone()).await;

        // 构建 API 请求
        let request = ChatCompletionRequest {
            model: "qwen-plus".to_string(),
            messages: messages.iter().map(ChatMessage::as_llm).collect::<Vec<_>>(),
            temperature: Some(0.1),
            max_tokens: Some(5000),
            top_p: Some(1.0),
            stream: Some(true), // Enable streaming
        };

        // 调用 AI API with streaming
        let manager = self.api_manager.read().await;
        let result = manager
            .chat_completion_stream(&request, move |chunk| {
                for choice in &chunk.choices {
                    if let Some(ref content) = choice.delta.content {
                        stream_callback(content.clone());
                    }
                }
            })
            .await;

        if result.is_err() {
            return None;
        }

        self.chat_histories.get_messages(&session_id).await
    }

    pub async fn translate_stream_collect<F, Fut>(
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
        println!("开始了");
        // 确定要使用的会话ID
        let session_id = match session_id {
            Some(id) => id.to_string(),
            None => {
                let active_id = self.active_session_id.read().await;
                active_id.as_ref()?.clone()
            }
        };

        // 添加用户消息
        self.chat_histories
            .add_user_message(&session_id, content.to_string(), raw)
            .await;

        // 获取历史
        let messages = self.chat_histories.get_messages(&session_id).await?;

        // 调用回调函数
        callback(messages.clone()).await;

        // 构建 API 请求
        let request = ChatCompletionRequest {
            model: "qwen-plus".to_string(),
            messages: messages.iter().map(ChatMessage::as_llm).collect::<Vec<_>>(),
            temperature: Some(0.1),
            max_tokens: Some(5000),
            top_p: Some(1.0),
            stream: Some(true), // Enable streaming
        };

        // 调用 AI API with streaming
        let manager = self.api_manager.read().await;
        let chunks = manager
            .chat_completion_stream_collect(&request)
            .await
            .ok()?;

        // Combine all content from chunks
        let mut full_content = String::new();
        for chunk in chunks {
            for choice in chunk.choices {
                if let Some(content) = choice.delta.content {
                    full_content.push_str(&content);
                }
            }
        }

        // 保存助手回复
        self.chat_histories
            .add_assistant_message(&session_id, full_content, None)
            .await;

        self.chat_histories.get_messages(&session_id).await
    }

    pub async fn get_histories(&self) -> ChatHistoriesState {
        self.chat_histories.clone()
    }
}
