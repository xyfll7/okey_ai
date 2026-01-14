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

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ModelType {
    Qwen,
    DeepSeek,
    OpenAI,
    Custom(String),
}

impl ModelType {
    pub fn as_str(&self) -> &str {
        match self {
            ModelType::Qwen => "Qwen Plus",
            ModelType::DeepSeek => "DeepSeek",
            ModelType::OpenAI => "OpenAI",
            ModelType::Custom(name) => name,
        }
    }

    pub fn from_str(s: &str) -> ModelType {
        match s {
            "Qwen Plus" => ModelType::Qwen,
            "DeepSeek" => ModelType::DeepSeek,
            "OpenAI" => ModelType::OpenAI,
            _ => ModelType::Custom(s.to_string()),
        }
    }
}

pub struct APIManager {
    clients: Arc<RwLock<HashMap<ModelType, Box<dyn LLMClient + Send + Sync>>>>,
    model_configs: Arc<RwLock<HashMap<ModelType, APIConfig>>>,
    current_model: Arc<RwLock<ModelType>>,
}

pub struct GlobalAPIManager(pub Arc<RwLock<APIManager>>);

impl APIManager {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(RwLock::new(HashMap::new())),
            model_configs: Arc::new(RwLock::new(HashMap::new())),
            current_model: Arc::new(RwLock::new(ModelType::Qwen)), // Updated to use ModelType
        }
    }

    pub async fn add_client(&self, name: ModelType, client: Box<dyn LLMClient + Send + Sync>) {
        let mut clients = self.clients.write().await;
        clients.insert(name, client);
    }

    pub async fn add_model_config(&self, model_type: ModelType, config: APIConfig) {
        let mut model_configs = self.model_configs.write().await;
        model_configs.insert(model_type, config);
    }

    pub async fn set_current_model(&self, model_name: ModelType) -> Result<(), String> {
        let clients = self.clients.read().await;
        if clients.contains_key(&model_name) {
            let mut current_model = self.current_model.write().await;
            *current_model = model_name;
            Ok(())
        } else {
            Err(format!(
                "Model {} not found in clients",
                model_name.as_str()
            ))
        }
    }

    pub async fn get_current_model(&self) -> String {
        let current_model = self.current_model.read().await;
        current_model.as_str().to_string() // Convert ModelType back to string
    }
    pub async fn get_current_model_config(&self) -> Option<APIConfig> {
        let current_model = self.current_model.read().await;
        let model_configs = self.model_configs.read().await;
        model_configs.get(&*current_model).cloned()
    }

    pub async fn chat_completion(
        &self,
        request: &ChatCompletionRequest<'_>,
    ) -> Result<ChatCompletionResponse, String> {
        let current_model = self.current_model.read().await;
        let clients = self.clients.read().await;

        let client = clients
            .get(&current_model)
            .ok_or_else(|| format!("No client configured for model: {}", current_model.as_str()))?;

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
            .get(&current_model)
            .ok_or_else(|| format!("No client configured for model: {}", current_model.as_str()))?;

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

    pub async fn initialize_default_clients(&self, configs: HashMap<String, APIConfig>) {
        for (name, config) in configs {
            let model_type = ModelType::from_str(&name);
            // Store the config separately so we can access the actual model name later
            self.add_model_config(model_type.clone(), config.clone())
                .await;
            let client: Box<dyn LLMClient + Send + Sync> = match model_type {
                ModelType::Qwen => Box::new(QwenClient::new(config)),
                ModelType::DeepSeek => Box::new(DeepSeekClient::new(config)),
                ModelType::OpenAI => Box::new(OpenAIClient::new(config)),
                ModelType::Custom(_) => Box::new(OpenAIClient::new(config)), // Default to OpenAI-compatible
            };
            self.add_client(model_type, client).await;
        }
    }
}
