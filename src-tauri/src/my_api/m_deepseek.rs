use crate::my_api::traits::{APIConfig, ChatCompletionChunk, ChatCompletionRequest, ChatCompletionResponse, ChatMessageDelta, ChoiceDelta, LLMClient, StreamHandle};
use futures::channel::oneshot;
use futures::future::select;
use futures::pin_mut;
use futures::stream::StreamExt;
use futures::FutureExt;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use tauri_plugin_http::reqwest;

#[derive(Debug)]
pub struct DeepSeekClient {
    config: APIConfig,
    client: reqwest::Client,
}

impl DeepSeekClient {
    pub fn new(config: APIConfig) -> Self {
        Self { config, client: reqwest::Client::new() }
    }
}

impl LLMClient for DeepSeekClient {
    fn get_config(&self) -> APIConfig {
        self.config.clone()
    }

    fn get_request_params(&self) -> HashMap<String, Value> {
        // DeepSeek 模型通常不需要特殊的思维功能参数
        HashMap::new()
    }

    fn chat_completion<'a>(&'a self, request: &'a ChatCompletionRequest) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<ChatCompletionResponse, String>> + Send + 'a>> {
        Box::pin(async move {
            let api_url = format!("{}/chat/completions", self.config.base_url);

            // Clone the request and ensure stream is false for non-streaming requests
            let mut request = request.clone();
            request.stream = Some(false);

            let json_body = serde_json::to_string(&request).map_err(|e| format!("Failed to serialize request: {}", e))?;
            let response = self.client.post(&api_url).header("Authorization", format!("Bearer {}", self.config.api_key)).header("Content-Type", "application/json").header("Accept", "application/json").body(json_body).send().await.map_err(|e| format!("Failed to send request: {}", e))?;
            if !response.status().is_success() {
                let status = response.status();
                let error_text = response.text().await.unwrap_or_default();
                return Err(format!("API request failed with status: {}, error: {}", status, error_text));
            }

            let response_text = response.text().await.map_err(|e| format!("Failed to read response text: {}", e))?;

            let deepseek_response: ChatCompletionResponse = serde_json::from_str(&response_text).map_err(|e| format!("Failed to parse response: {}", e))?;

            Ok(deepseek_response)
        })
    }

    fn chat_completion_stream<'a>(&'a self, request: &'a ChatCompletionRequest) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<StreamHandle, String>> + Send + 'a>> {
        Box::pin(async move {
            let api_url = format!("{}/chat/completions", self.config.base_url);

            let mut request = request.clone();
            request.stream = Some(true);

            let json_body = serde_json::to_string(&request).map_err(|e| format!("Failed to serialize request: {}", e))?;

            let response = self.client.post(&api_url).header("Authorization", format!("Bearer {}", self.config.api_key)).header("Content-Type", "application/json").header("Accept", "text/event-stream").header("Cache-Control", "no-cache").header("Connection", "keep-alive").body(json_body).send().await.map_err(|e| format!("Failed to send request: {}", e))?;
            if !response.status().is_success() {
                let status = response.status();
                let error_text = response.text().await.unwrap_or_default();
                return Err(format!("API request failed with status: {}, error: {}", status, error_text));
            }

            let byte_stream = response.bytes_stream();

            let (tx, rx) = futures::channel::mpsc::unbounded();
            let (cancel_tx, cancel_rx) = oneshot::channel::<()>();

            let _handle = tauri::async_runtime::spawn(async move {
                let mut buffer = String::new();
                let mut stream = byte_stream;
                let cancel_fut = cancel_rx.fuse();
                pin_mut!(cancel_fut);

                loop {
                    let next_chunk = stream.next().fuse();
                    pin_mut!(next_chunk);

                    match select(&mut cancel_fut, next_chunk).await {
                        futures::future::Either::Left((_, _)) => {
                            break;
                        }
                        futures::future::Either::Right((chunk_result, _)) => match chunk_result {
                            Some(Ok(bytes)) => match std::str::from_utf8(&bytes) {
                                Ok(text) => {
                                    buffer.push_str(text);
                                    while let Some(pos) = buffer.find('\n') {
                                        let (line, rest) = buffer.split_at(pos);
                                        let line = line.to_string();
                                        buffer = rest[1..].to_string();

                                        if line.trim().is_empty() {
                                            continue;
                                        }

                                        if line.starts_with("data: ") {
                                            let data = line[6..].trim();

                                            if data == "[DONE]" {
                                                return;
                                            }

                                            match serde_json::from_str::<DeepSeekStreamResponse>(data) {
                                                Ok(stream_response) => {
                                                    let chunk = ChatCompletionChunk {
                                                        id: stream_response.id,
                                                        object: stream_response.object,
                                                        created: stream_response.created,
                                                        model: stream_response.model,
                                                        choices: stream_response.choices.into_iter().map(|choice| ChoiceDelta { index: choice.index, delta: ChatMessageDelta { role: choice.delta.role, content: choice.delta.content }, finish_reason: choice.finish_reason }).collect(),
                                                    };
                                                    let _ = tx.unbounded_send(Ok(chunk));
                                                }
                                                Err(e) => {
                                                    let _ = tx.unbounded_send(Err(format!("Failed to parse stream data: {}", e)));
                                                }
                                            }
                                        }
                                    }
                                }
                                Err(e) => {
                                    let _ = tx.unbounded_send(Err(format!("Failed to decode UTF-8: {}", e)));
                                }
                            },
                            Some(Err(e)) => {
                                let _ = tx.unbounded_send(Err(format!("Failed to read response chunk: {}", e)));
                                return;
                            }
                            None => {
                                return;
                            }
                        },
                    }
                }
            });

            Ok(StreamHandle { stream: rx.map(|x| x.map_err(|e| e.to_string())).boxed(), cancel: cancel_tx })
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct DeepSeekStreamResponse {
    id: String,
    object: String,
    created: u64,
    model: String,
    choices: Vec<DeepSeekStreamChoice>,
}

#[derive(Debug, Serialize, Deserialize)]
struct DeepSeekStreamChoice {
    delta: DeepSeekStreamDelta,
    index: u32,
    finish_reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct DeepSeekStreamDelta {
    role: Option<String>,
    content: Option<String>,
}
