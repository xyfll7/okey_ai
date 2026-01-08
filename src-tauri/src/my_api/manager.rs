use crate::my_api::m_deepseek::DeepSeekClient;
use crate::my_api::m_openai::OpenAIClient;
use crate::my_api::m_qwen::QwenClient;
use crate::my_api::traits::{
    APIConfig, ChatCompletionChunk, ChatCompletionRequest, ChatCompletionResponse, LLMClient,
};
use futures::StreamExt; // Add this import for the .next() method
use std::collections::HashMap;
use std::sync::Arc;
use tauri::async_runtime::RwLock;

pub struct APIManager {
    clients: Arc<RwLock<HashMap<String, Box<dyn LLMClient + Send + Sync>>>>,
    current_model: Arc<RwLock<String>>,
}

pub struct GlobalAPIManager(pub Arc<RwLock<APIManager>>);

impl APIManager {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(RwLock::new(HashMap::new())),
            current_model: Arc::new(RwLock::new("qwen".to_string())),
        }
    }

    pub async fn add_client(&self, name: String, client: Box<dyn LLMClient + Send + Sync>) {
        let mut clients = self.clients.write().await;
        clients.insert(name, client);
    }

    pub async fn set_current_model(&self, model_name: String) -> Result<(), String> {
        let clients = self.clients.read().await;
        if clients.contains_key(&model_name) {
            let mut current_model = self.current_model.write().await;
            *current_model = model_name;
            Ok(())
        } else {
            Err(format!("Model {} not found in clients", model_name))
        }
    }

    pub async fn get_current_model(&self) -> String {
        let current_model = self.current_model.read().await;
        current_model.clone()
    }

    pub async fn chat_completion(
        &self,
        request: &ChatCompletionRequest<'_>,
    ) -> Result<ChatCompletionResponse, String> {
        let current_model = self.current_model.read().await;
        let clients = self.clients.read().await;

        let client = clients
            .get(&*current_model)
            .ok_or_else(|| format!("No client configured for model: {}", current_model))?;

        // Call the client's chat_completion method which returns a future
        client.chat_completion(request).await
    }

    pub async fn chat_completion_stream<F>(
        &self,
        request: &ChatCompletionRequest<'_>,
        mut callback: F,
    ) -> Result<(), String>
    where
        F: FnMut(ChatCompletionChunk) + Send,
    {
        let current_model = self.current_model.read().await;
        let clients = self.clients.read().await;

        let client = clients
            .get(&*current_model)
            .ok_or_else(|| format!("No client configured for model: {}", current_model))?;

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
        clients.keys().cloned().collect()
    }

    pub async fn initialize_default_clients(&self, configs: HashMap<String, APIConfig>) {
        for (name, config) in configs {
            match name.as_str() {
                "qwen" => {
                    let client = Box::new(QwenClient::new(config));
                    self.add_client(name, client).await;
                }
                "deepseek" => {
                    let client = Box::new(DeepSeekClient::new(config));
                    self.add_client(name, client).await;
                }
                "openai" => {
                    let client = Box::new(OpenAIClient::new(config));
                    self.add_client(name, client).await;
                }
                _ => {
                    // For unknown models, try to use the OpenAI-compatible interface
                    let client = Box::new(OpenAIClient::new(config));
                    self.add_client(name, client).await;
                }
            }
        }
    }
}
