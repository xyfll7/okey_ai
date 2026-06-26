use crate::my_api::m_deepseek::DeepSeekClient;
use crate::my_api::m_openai::OpenAIClient;
use crate::my_api::m_qwen::QwenClient;
use crate::my_api::m_zai::ZAIClient;
use crate::my_api::traits::{APIConfig, ChatCompletionChunk, ChatCompletionRequest, ChatCompletionResponse, LLMClient};
use crate::states::app_config::ModelProvider;
use futures::channel::oneshot;
use futures::StreamExt; // Add this import for the .next() method
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::async_runtime::RwLock;

pub struct APIManager {
    clients: Arc<RwLock<HashMap<ModelProvider, Box<dyn LLMClient + Send + Sync>>>>,
    current_cancel_sender: Arc<RwLock<Option<oneshot::Sender<()>>>>,
}

#[derive(Clone)]
pub struct GlobalAPIManager(pub Arc<RwLock<APIManager>>);

impl APIManager {
    pub fn new() -> Self {
        Self { clients: Arc::new(RwLock::new(HashMap::new())), current_cancel_sender: Arc::new(RwLock::new(None)) }
    }

    pub async fn add_client(&self, name: ModelProvider, client: Box<dyn LLMClient + Send + Sync>) {
        let mut clients = self.clients.write().await;
        clients.insert(name, client);
    }

    pub async fn get_current_client_config(&self, model_type: &ModelProvider) -> APIConfig {
        let clients = self.clients.read().await;

        let client = clients.get(model_type).expect(&format!("No client configured for model: {:?}", model_type));
        client.get_config()
    }

    pub async fn get_current_model_request_params(&self, model_type: &ModelProvider) -> HashMap<String, Value> {
        let clients = self.clients.read().await;

        let client = clients.get(model_type).expect(&format!("No client configured for model: {:?}", model_type));

        client.get_request_params()
    }

    pub async fn chat_completion(&self, request: &ChatCompletionRequest, model_type: &ModelProvider) -> Result<ChatCompletionResponse, String> {
        let clients = self.clients.read().await;

        let client = clients.get(model_type).ok_or_else(|| format!("No client configured for model: {:?}", model_type))?;

        // Call the client's chat_completion method which returns a future
        client.chat_completion(request).await
    }

    pub async fn chat_completion_stream<F>(&self, request: &ChatCompletionRequest, model_type: &ModelProvider, mut callback: F) -> Result<(), String>
    where
        F: FnMut(ChatCompletionChunk) + Send,
    {
        let clients = self.clients.read().await;

        let client = clients.get(model_type).ok_or_else(|| format!("No client configured for model: {:?}", model_type))?;

        let stream_handle = client.chat_completion_stream(request).await?;

        let mut cancel_sender = self.current_cancel_sender.write().await;
        *cancel_sender = Some(stream_handle.cancel);
        drop(cancel_sender);

        let mut stream = stream_handle.stream;

        while let Some(chunk_result) = stream.next().await {
            match chunk_result {
                Ok(chunk) => callback(chunk),
                Err(e) => return Err(e),
            }
        }

        let mut cancel_sender = self.current_cancel_sender.write().await;
        *cancel_sender = None;
        drop(cancel_sender);

        Ok(())
    }

    pub async fn abort_chat_stream(&self) -> Result<(), String> {
        let mut cancel_sender = self.current_cancel_sender.write().await;
        if let Some(sender) = cancel_sender.take() {
            let _ = sender.send(());
        }
        Ok(())
    }

    pub async fn initialize_default_clients(&self, configs: HashMap<ModelProvider, APIConfig>) {
        for (model_type, config) in configs {
            let client: Box<dyn LLMClient + Send + Sync> = match model_type {
                ModelProvider::Qwen => Box::new(QwenClient::new(config)),
                ModelProvider::DeepSeek => Box::new(DeepSeekClient::new(config)),
                ModelProvider::OpenAI => Box::new(OpenAIClient::new(config)),
                ModelProvider::ZAI => Box::new(ZAIClient::new(config)),          // Use ZAI-specific client
                ModelProvider::Custom(_) => Box::new(OpenAIClient::new(config)), // Default to OpenAI-compatible
            };
            self.add_client(model_type, client).await;
        }
    }
}
