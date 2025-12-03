// Example usage of the multi-model API system
use crate::my_api::traits::{ChatCompletionRequest, ChatMessage, APIConfig};

// This demonstrates how to initialize and use the API manager from Rust code
#[allow(dead_code)]
pub async fn example_usage() {
    use std::collections::HashMap;
    use crate::my_api::manager::create_api_manager;

    // Create API configurations for different models
    let mut configs = HashMap::new();

    // Example configurations (these would come from user settings)
    configs.insert(
        "openai".to_string(),
        APIConfig {
            api_key: "your-openai-api-key".to_string(),
            base_url: "https://api.openai.com/v1".to_string(),
            model: "gpt-4".to_string(),
        },
    );

    configs.insert(
        "qwen".to_string(),
        APIConfig {
            api_key: "your-qwen-api-key".to_string(),
            base_url: "https://dashscope.aliyuncs.com".to_string(),
            model: "qwen-max".to_string(),
        },
    );

    configs.insert(
        "deepseek".to_string(),
        APIConfig {
            api_key: "your-deepseek-api-key".to_string(),
            base_url: "https://api.deepseek.com".to_string(),
            model: "deepseek-chat".to_string(),
        },
    );

    // Create the API manager with the configurations
    let api_manager = create_api_manager(configs).await;

    // Switch to a specific model
    api_manager.set_current_model("qwen".to_string()).await.unwrap();

    // Create a chat completion request
    let request = ChatCompletionRequest {
        model: "gpt-4".to_string(),
        messages: vec![
            ChatMessage {
                role: "system".to_string(),
                content: "You are a helpful assistant.".to_string(),
            },
            ChatMessage {
                role: "user".to_string(),
                content: "Hello, how are you?".to_string(),
            },
        ],
        temperature: Some(0.7),
        max_tokens: Some(150),
        top_p: Some(1.0),
        stream: Some(false),
    };

    // Execute the request using the currently selected model
    match api_manager.chat_completion(&request).await {
        Ok(response) => {
            println!("Response: {:?}", response);
        }
        Err(e) => {
            eprintln!("Error: {}", e);
        }
    }
}