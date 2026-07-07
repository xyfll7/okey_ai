use crate::utils::chat_message::LLMChatMessage;
use futures::channel::oneshot;
use futures::stream::BoxStream;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::future::Future;

#[derive(Debug, Serialize, Clone)]
pub struct ChatCompletionRequest {
    pub model: String,
    pub messages: Vec<LLMChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
    #[serde(flatten)]
    pub extra_params: HashMap<String, Value>,
}

// Streaming response types
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

pub struct StreamHandle {
    pub stream: BoxStream<'static, Result<ChatCompletionChunk, String>>,
    pub cancel: oneshot::Sender<()>,
}

pub trait LLMClient {
    fn get_config(&self) -> APIConfig;

    // 获取特定于模型的请求参数
    fn get_request_params(&self) -> HashMap<String, Value>;

    fn chat_completion_stream<'a>(&'a self, request: &'a ChatCompletionRequest) -> std::pin::Pin<Box<dyn Future<Output = Result<StreamHandle, String>> + Send + 'a>>;
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct APIConfig {
    pub api_key: String,
    pub base_url: String,
    pub model: String,
    pub index: u32,
}
