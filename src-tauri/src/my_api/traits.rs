use crate::utils::chat_message::ChatMessage;
use crate::utils::chat_message::LLMChatMessage;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Clone)]
pub struct ChatCompletionRequest<'a> {
    pub model: String,
    pub messages: Vec<LLMChatMessage<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatCompletionResponse {
    pub id: String,
    pub object: String,
    pub created: u64,
    pub model: String,
    pub choices: Vec<Choice>,
    pub usage: Option<Usage>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Choice {
    pub index: u32,
    pub message: ChatMessage,
    pub finish_reason: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Usage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

pub trait LLMClient {
    fn chat_completion<'a>(
        &'a self,
        request: &'a ChatCompletionRequest,
    ) -> std::pin::Pin<
        Box<dyn std::future::Future<Output = Result<ChatCompletionResponse, String>> + Send + 'a>,
    >;
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct APIConfig {
    pub api_key: String,
    pub base_url: String,
    pub model: String,
}
