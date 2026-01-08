pub mod commands;
pub mod m_deepseek;
pub mod m_openai;
pub mod m_qwen;
pub mod manager;
pub mod traits;

use std::collections::HashMap;
use tauri::{AppHandle, Manager};

pub fn setup_api_manager(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    tauri::async_runtime::spawn({
        let app_handle = app.clone();
        async move {
            let api_manager_state = app_handle.state::<crate::my_api::manager::GlobalAPIManager>();

            let configs = get_default_configs();
            let configs_vec: Vec<(String, crate::my_api::traits::APIConfig)> =
                configs.into_iter().collect();

            if let Err(e) =
                crate::my_api::commands::initialize_api_manager(configs_vec, api_manager_state)
                    .await
            {
                eprintln!("Failed to initialize API manager: {}", e);
            } else {
                println!("API manager initialized successfully");
            }
        }
    });

    Ok(())
}

// Get default configurations for initialization
fn get_default_configs() -> HashMap<String, crate::my_api::traits::APIConfig> {
    let mut configs = HashMap::new();

    // Example configurations (these would come from user settings)
    configs.insert(
        "openai".to_string(),
        crate::my_api::traits::APIConfig {
            api_key: "your-openai-api-key".to_string(),
            base_url: "https://api.openai.com/v1".to_string(),
            model: "gpt-4".to_string(),
        },
    );

    configs.insert(
        "qwen".to_string(),
        crate::my_api::traits::APIConfig {
            api_key: "sk-3ab003e0b90346e58d4072f402a15b13".to_string(),
            base_url: "https://dashscope.aliyuncs.com".to_string(),
            model: "qwen-plus".to_string(),
        },
    );

    configs.insert(
        "deepseek".to_string(),
        crate::my_api::traits::APIConfig {
            api_key: "your-deepseek-api-key".to_string(),
            base_url: "https://api.deepseek.com".to_string(),
            model: "deepseek-chat".to_string(),
        },
    );

    configs
}
