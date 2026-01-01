use crate::my_api::traits::{APIConfig, ChatCompletionRequest, ChatCompletionResponse, LLMClient};
use tauri_plugin_http::reqwest;

#[derive(Debug)]
pub struct OpenAIClient {
    config: APIConfig,
    client: reqwest::Client,
}

impl OpenAIClient {
    pub fn new(config: APIConfig) -> Self {
        Self {
            config,
            client: reqwest::Client::new(),
        }
    }
}

impl LLMClient for OpenAIClient {
    fn chat_completion<'a>(
        &'a self,
        request: &'a ChatCompletionRequest,
    ) -> std::pin::Pin<
        Box<dyn std::future::Future<Output = Result<ChatCompletionResponse, String>> + Send + 'a>,
    > {
        Box::pin(async move {
            let api_url = format!("{}/chat/completions", self.config.base_url);

            let json_body = serde_json::to_string(request)
                .map_err(|e| format!("Failed to serialize request: {}", e))?;

            let response = self
                .client
                .post(&api_url)
                .header("Authorization", format!("Bearer {}", self.config.api_key))
                .header("Content-Type", "application/json")
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

            let openai_response: ChatCompletionResponse = serde_json::from_str(&response_text)
                .map_err(|e| format!("Failed to parse response: {}", e))?;

            Ok(openai_response)
        })
    }
}
