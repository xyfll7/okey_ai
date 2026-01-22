use crate::my_api::m_deepseek::DeepSeekClient;
use crate::my_api::m_openai::OpenAIClient;
use crate::my_api::m_qwen::QwenClient;
use crate::my_api::m_zai::ZAIClient;
use crate::my_api::traits::{
    APIConfig, ChatCompletionChunk, ChatCompletionRequest, ChatCompletionResponse, LLMClient,
};
use crate::states::app_config::ModelType;
use futures::StreamExt; // Add this import for the .next() method
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::async_runtime::RwLock;

pub struct APIManager {
    clients: Arc<RwLock<HashMap<ModelType, Box<dyn LLMClient + Send + Sync>>>>,
}

#[derive(Clone)]
pub struct GlobalAPIManager(pub Arc<RwLock<APIManager>>);

impl APIManager {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn add_client(&self, name: ModelType, client: Box<dyn LLMClient + Send + Sync>) {
        let mut clients = self.clients.write().await;
        clients.insert(name, client);
    }

    pub async fn get_current_client_config(&self, model_type: &ModelType) -> APIConfig {
        let clients = self.clients.read().await;

        let client = clients
            .get(model_type)
            .expect(&format!("No client configured for model: {:?}", model_type));
        client.get_config()
    }

    pub async fn get_current_model_request_params(
        &self,
        model_type: &ModelType,
    ) -> HashMap<String, Value> {
        let clients = self.clients.read().await;

        let client = clients
            .get(model_type)
            .expect(&format!("No client configured for model: {:?}", model_type));

        client.get_request_params()
    }

    pub async fn chat_completion(
        &self,
        request: &ChatCompletionRequest,
        model_type: &ModelType,
    ) -> Result<ChatCompletionResponse, String> {
        let clients = self.clients.read().await;

        let client = clients
            .get(model_type)
            .ok_or_else(|| format!("No client configured for model: {:?}", model_type))?;

        // Call the client's chat_completion method which returns a future
        client.chat_completion(request).await
    }

    pub async fn chat_completion_stream<F>(
        &self,
        request: &ChatCompletionRequest,
        model_type: &ModelType,
        mut callback: F,
    ) -> Result<(), String>
    where
        F: FnMut(ChatCompletionChunk) + Send,
    {
        let clients = self.clients.read().await;

        let client = clients
            .get(model_type)
            .ok_or_else(|| format!("No client configured for model: {:?}", model_type))?;

        let mut stream = client.chat_completion_stream(request).await?;

        while let Some(chunk_result) = stream.next().await {
            match chunk_result {
                Ok(chunk) => callback(chunk),
                Err(e) => return Err(e),
            }
        }

        Ok(())
    }

    pub async fn list_available_models(&self) -> Vec<String> {
        let clients = self.clients.read().await;
        clients.keys().map(|k| k.as_str().to_string()).collect()
    }

    pub async fn initialize_default_clients(&self, configs: HashMap<ModelType, APIConfig>) {
        for (model_type, config) in configs {
            let client: Box<dyn LLMClient + Send + Sync> = match model_type {
                ModelType::Qwen => Box::new(QwenClient::new(config)),
                ModelType::DeepSeek => Box::new(DeepSeekClient::new(config)),
                ModelType::OpenAI => Box::new(OpenAIClient::new(config)),
                ModelType::ZAI => Box::new(ZAIClient::new(config)), // Use ZAI-specific client
                ModelType::Custom(_) => Box::new(OpenAIClient::new(config)), // Default to OpenAI-compatible
            };
            self.add_client(model_type, client).await;
        }
    }
}
