pub mod commands;
pub mod m_deepseek;
pub mod m_openai;
pub mod m_qwen;
pub mod m_zai;
pub mod manager;
pub mod traits;

use std::collections::HashMap;
use tauri::{AppHandle, Manager};
use traits::APIConfig;

use crate::states::app_config::ModelProvider;

pub fn setup_api_manager(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    tauri::async_runtime::spawn({
        let app_handle = app.clone();
        async move {
            let api_manager_state = app_handle.state::<manager::GlobalAPIManager>();

            let config_map = get_default_configs();

            let _ = api_manager_state
                .0
                .write()
                .await
                .initialize_default_clients(config_map)
                .await;
            println!("API manager initialized successfully");
        }
    });
    Ok(())
}

// Get default configurations for initialization
fn get_default_configs() -> HashMap<ModelProvider, APIConfig> {
    let mut configs = HashMap::new();

    // Example configurations (these would come from user settings)
    configs.insert(
        ModelProvider::OpenAI,
        APIConfig {
            api_key: "your-openai-api-key".to_string(),
            base_url: "https://api.openai.com/v1".to_string(),
            model: "gpt-4".to_string(),
        },
    );

    configs.insert(
        ModelProvider::Qwen,
        APIConfig {
            api_key: "sk-3ab003e0b90346e58d4072f402a15b13".to_string(),
            base_url: "https://dashscope.aliyuncs.com".to_string(),
            model: "qwen-plus".to_string(),
        },
    );

    configs.insert(
        ModelProvider::DeepSeek,
        APIConfig {
            api_key: "sk-ae24d74445814224b94553fc5228b569".to_string(),
            base_url: "https://api.deepseek.com".to_string(),
            model: "deepseek-chat".to_string(),
        },
    );

    configs.insert(
        ModelProvider::ZAI,
        APIConfig {
            api_key: "9899af6115c74c1e8ca3eb4bc68e92ba.FCIVu4e7Oz0tNqmP".to_string(), // 智谱AI的API密钥
            base_url: "https://open.bigmodel.cn/api/paas/v4".to_string(), // 智谱AI的API基础URL
            model: "glm-4.7".to_string(),                                 // 智谱AI的模型
        },
    );

    configs
}
