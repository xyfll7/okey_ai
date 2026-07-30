use crate::utils::chat_message::LLMChatMessage;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Clone)]
pub struct ChatCompletionRequest {
    pub messages: Vec<LLMChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
}

// Streaming response types (shapes kept OpenAI-compatible so callers are unchanged).
#[derive(Debug, Serialize, Deserialize)]
pub struct ChatCompletionChunk {
    pub id: String,
    pub object: String,
    pub created: u64,
    pub model: String,
    pub choices: Vec<ChoiceDelta>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChoiceDelta {
    pub index: u32,
    pub delta: ChatMessageDelta,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessageDelta {
    pub role: Option<String>,
    pub content: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct APIConfig {
    pub api_key: String,
    pub base_url: String,
    pub model: String,
    pub index: u32,
}
