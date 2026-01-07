use crate::my_api::traits::{
    APIConfig, ChatCompletionChunk, ChatCompletionRequest, ChatCompletionResponse,
    ChatMessageDelta, ChoiceDelta, LLMClient,
};
use futures::stream::{BoxStream, StreamExt};
use serde::{Deserialize, Serialize};
use tauri_plugin_http::reqwest;

#[derive(Debug)]
pub struct DeepSeekClient {
    config: APIConfig,
    client: reqwest::Client,
}

impl DeepSeekClient {
    pub fn new(config: APIConfig) -> Self {
        Self {
            config,
            client: reqwest::Client::new(),
        }
    }
}

impl LLMClient for DeepSeekClient {
    fn chat_completion<'a>(
        &'a self,
        request: &'a ChatCompletionRequest,
    ) -> std::pin::Pin<
        Box<dyn std::future::Future<Output = Result<ChatCompletionResponse, String>> + Send + 'a>,
    > {
        Box::pin(async move {
            let api_url = format!("{}/chat/completions", self.config.base_url);

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
                    "API request failed with status: {}",
                    response.status()
                ));
            }

            let response_text = response
                .text()
                .await
                .map_err(|e| format!("Failed to read response text: {}", e))?;

            let deepseek_response: ChatCompletionResponse = serde_json::from_str(&response_text)
                .map_err(|e| format!("Failed to parse response: {}", e))?;

            Ok(deepseek_response)
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
            let api_url = format!("{}/chat/completions", self.config.base_url);

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
                .header("Cache-Control", "no-cache")
                .header("Connection", "keep-alive")
                .body(json_body)
                .send()
                .await
                .map_err(|e| format!("Failed to send request: {}", e))?;

            if !response.status().is_success() {
                return Err(format!(
                    "API request failed with status information: {}",
                    response.status()
                ));
            }

            // Use bytes_stream for true streaming
            let byte_stream = response.bytes_stream();

            // Create a channel to send chunks as they arrive
            let (tx, rx) = futures::channel::mpsc::unbounded();

            // Spawn a task to process the stream and send chunks to the receiver
            let _handle = tauri::async_runtime::spawn(async move {
                let mut buffer = String::new();
                let mut stream = byte_stream;

                while let Some(chunk_result) = stream.next().await {
                    match chunk_result {
                        Ok(bytes) => {
                            match std::str::from_utf8(&bytes) {
                                Ok(text) => {
                                    buffer.push_str(text);
                                    // Process all complete lines from the buffer
                                    loop {
                                        let (line, rest) = match split_first_line(&buffer) {
                                            Some((line, rest)) => {
                                                (line.to_string(), rest.to_string())
                                            }
                                            None => {
                                                // No complete line available, break and wait for more data
                                                break;
                                            }
                                        };

                                        buffer = rest;

                                        if line.trim().is_empty() {
                                            continue;
                                        }

                                        if line.starts_with("data: ") {
                                            let data = line[6..].trim();

                                            if data == "[DONE]" {
                                                break;
                                            }

                                            match serde_json::from_str::<DeepSeekStreamResponse>(
                                                data,
                                            ) {
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
                                                    if tx.unbounded_send(Ok(chunk)).is_err() {
                                                        break;
                                                    }
                                                }
                                                Err(e) => {
                                                    let _ = tx.unbounded_send(Err(format!(
                                                        "Failed to parse stream data: {}",
                                                        e
                                                    )));
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                                Err(e) => {
                                    let _ = tx.unbounded_send(Err(format!(
                                        "Failed to decode UTF-8: {}",
                                        e
                                    )));
                                    break;
                                }
                            }
                        }
                        Err(e) => {
                            let _ = tx.unbounded_send(Err(format!(
                                "Failed to read response chunk: {}",
                                e
                            )));
                            break;
                        }
                    }
                }
            });

            // Convert the receiver into a stream
            Ok(rx.map(|x| x.map_err(|e| e.to_string())).boxed())
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
