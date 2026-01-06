use crate::my_api::traits::{
    APIConfig, ChatCompletionChunk, ChatCompletionRequest, ChatCompletionResponse,
    ChatMessageDelta, ChoiceDelta, LLMClient,
};
use crate::utils::chat_message::ChatMessage;
use futures::stream::{BoxStream, StreamExt};
use serde::{Deserialize, Serialize};
use tauri_plugin_http::reqwest;

#[derive(Debug)]
pub struct QwenClient {
    config: APIConfig,
    client: reqwest::Client,
}

impl QwenClient {
    pub fn new(config: APIConfig) -> Self {
        Self {
            config,
            client: reqwest::Client::new(),
        }
    }
}

impl LLMClient for QwenClient {
    fn chat_completion<'a>(
        &'a self,
        request: &'a ChatCompletionRequest,
    ) -> std::pin::Pin<
        Box<dyn std::future::Future<Output = Result<ChatCompletionResponse, String>> + Send + 'a>,
    > {
        Box::pin(async move {
            let api_url = format!(
                "{}/compatible-mode/v1/chat/completions",
                self.config.base_url
            );

            let mut request = request.clone();
            request.stream = Some(false); // Ensure stream is false for non-streaming requests

            let json_body = serde_json::to_string(&request)
                .map_err(|e| format!("Failed to serialize request: {}", e))?;

            let response = self
                .client
                .post(&api_url)
                .header("Authorization", format!("Bearer {}", self.config.api_key))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .body(json_body)
                .send()
                .await
                .map_err(|e| format!("Failed to send request: {}", e))?;

            if !response.status().is_success() {
                return Err(format!(
                    "API request failed with status信息: {}",
                    response.status()
                ));
            }

            let response_text = response
                .text()
                .await
                .map_err(|e| format!("Failed to read response text: {}", e))?;

            let qwen_response: QwenChatResponse = serde_json::from_str(&response_text)
                .map_err(|e| format!("Failed to parse response: {}", e))?;

            // Convert Qwen response to standard format
            Ok(ChatCompletionResponse {
                id: qwen_response.id,
                object: qwen_response.object,
                created: qwen_response.created,
                model: qwen_response.model,
                choices: qwen_response
                    .choices
                    .into_iter()
                    .map(|choice| crate::my_api::traits::Choice {
                        index: choice.index,
                        message: choice.message,
                        finish_reason: choice.finish_reason,
                    })
                    .collect(),
                usage: Some(crate::my_api::traits::Usage {
                    prompt_tokens: qwen_response.usage.prompt_tokens,
                    completion_tokens: qwen_response.usage.completion_tokens,
                    total_tokens: qwen_response.usage.total_tokens,
                }),
            })
        })
    }

    fn chat_completion_stream<'a>(
        &'a self,
        request: &'a ChatCompletionRequest,
    ) -> std::pin::Pin<
        Box<
            dyn std::future::Future<
                    Output = Result<BoxStream<'a, Result<ChatCompletionChunk, String>>, String>,
                > + Send
                + 'a,
        >,
    > {
        Box::pin(async move {
            let api_url = format!(
                "{}/compatible-mode/v1/chat/completions",
                self.config.base_url
            );

            let mut request = request.clone();
            request.stream = Some(true); // Enable streaming

            let json_body = serde_json::to_string(&request)
                .map_err(|e| format!("Failed to serialize request: {}", e))?;

            let response = self
                .client
                .post(&api_url)
                .header("Authorization", format!("Bearer {}", self.config.api_key))
                .header("Content-Type", "application/json")
                .header("Accept", "text/event-stream")
                .body(json_body)
                .send()
                .await
                .map_err(|e| format!("Failed to send request: {}", e))?;

            if !response.status().is_success() {
                return Err(format!(
                    "API request failed with status信息: {}",
                    response.status()
                ));
            }

            // Use text streaming instead of bytes_stream since tauri-plugin-http doesn't support it directly
            let response_text = response
                .text()
                .await
                .map_err(|e| format!("Failed to read response text: {}", e))?;

            // Process the streaming response manually by splitting on newlines
            let chunks: Vec<String> = response_text
                .split('\n')
                .filter(|line| !line.trim().is_empty() && line.starts_with("data: "))
                .map(|line| line[6..].trim().to_string()) // Remove "data: " prefix
                .filter(|data| !data.is_empty() && data != "[DONE]")
                .collect();

            let stream = futures::stream::iter(chunks).then(|data| async move {
                match serde_json::from_str::<QwenChatStreamResponse>(&data) {
                    Ok(stream_response) => {
                        // Convert stream response to standard chunk format
                        let chunk = ChatCompletionChunk {
                            id: stream_response.id,
                            object: stream_response.object,
                            created: stream_response.created,
                            model: stream_response.model,
                            choices: stream_response
                                .choices
                                .into_iter()
                                .map(|choice| ChoiceDelta {
                                    index: choice.index,
                                    delta: ChatMessageDelta {
                                        role: choice.delta.role,
                                        content: choice.delta.content,
                                    },
                                    finish_reason: choice.finish_reason,
                                })
                                .collect(),
                        };
                        Ok(chunk)
                    }
                    Err(e) => Err(format!("Failed to parse stream data: {}", e)),
                }
            });

            Ok(stream.boxed())
        })
    }
}

fn split_first_line(buffer: &str) -> Option<(&str, &str)> {
    if let Some(pos) = buffer.find('\n') {
        let (line, rest) = buffer.split_at(pos);
        if line.ends_with('\r') {
            Some((&line[..line.len() - 1], &rest[1..]))
        } else {
            Some((line, &rest[1..]))
        }
    } else {
        None
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct QwenChatResponse {
    id: String,
    object: String,
    created: u64,
    model: String,
    choices: Vec<QwenChoice>,
    usage: QwenUsage,
}

#[derive(Debug, Serialize, Deserialize)]
struct QwenChatStreamResponse {
    id: String,
    object: String,
    created: u64,
    model: String,
    choices: Vec<QwenStreamChoice>,
}

#[derive(Debug, Serialize, Deserialize)]
struct QwenStreamChoice {
    delta: QwenStreamDelta,
    index: u32,
    finish_reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct QwenStreamDelta {
    role: Option<String>,
    content: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct QwenChoice {
    message: ChatMessage,
    finish_reason: String,
    index: u32,
}

#[derive(Debug, Serialize, Deserialize)]
struct QwenUsage {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
    #[serde(rename = "prompt_tokens_details")]
    prompt_tokens_details: Option<PromptTokensDetails>,
}

#[derive(Debug, Serialize, Deserialize)]
struct PromptTokensDetails {
    #[serde(rename = "cached_tokens")]
    cached_tokens: Option<u32>,
}
