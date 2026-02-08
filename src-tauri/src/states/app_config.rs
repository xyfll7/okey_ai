use crate::my_api::traits::APIConfig;
use dotenvy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Eq, Hash, PartialEq)]
pub enum ModelProvider {
    #[serde(rename = "Qwen")]
    Qwen,
    #[serde(rename = "DeepSeek")]
    DeepSeek,
    #[serde(rename = "OpenAI")]
    OpenAI,
    #[serde(rename = "ZAI")]
    ZAI,
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Shortcut {
    pub name: String,
    pub hot_key: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum AutoSpeakState {
    Off,
    #[default]
    Single,
    All,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub shortcuts: Vec<Shortcut>,
    pub is_pin_translate_window: bool,
    pub auto_speak: AutoSpeakState,
    pub current_model: ModelProvider,
    pub api_configs: HashMap<ModelProvider, APIConfig>,
}

impl Default for AppConfig {
    fn default() -> Self {
        dotenvy::dotenv().ok();
        let mut api_configs = HashMap::new();
        api_configs.insert(
            ModelProvider::OpenAI,
            APIConfig {
                api_key: std::env::var("OPENAI_API_KEY").unwrap_or_else(|_| "".to_string()),
                base_url: "https://api.openai.com/v1".to_string(),
                model: "gpt-4".to_string(),
                index: 0,
            },
        );

        api_configs.insert(
            ModelProvider::Qwen,
            APIConfig {
                api_key: std::env::var("QWEN_API_KEY").unwrap_or_else(|_| "".to_string()),
                base_url: "https://dashscope.aliyuncs.com".to_string(),
                model: "qwen-plus".to_string(),
                index: 1,
            },
        );

        api_configs.insert(
            ModelProvider::DeepSeek,
            APIConfig {
                api_key: std::env::var("DEEPSEEK_API_KEY").unwrap_or_else(|_| "".to_string()),
                base_url: "https://api.deepseek.com".to_string(),
                model: "deepseek-chat".to_string(),
                index: 2,
            },
        );

        api_configs.insert(
            ModelProvider::ZAI,
            APIConfig {
                api_key: std::env::var("ZAI_API_KEY").unwrap_or_else(|_| "".to_string()),
                base_url: "https://open.bigmodel.cn/api/paas/v4".to_string(),
                model: "glm-4.7".to_string(),
                index: 3,
            },
        );

        AppConfig {
            shortcuts: vec![Shortcut {
                name: "okey_ai".to_string(),
                hot_key: ["Ctrl+G", "Cmd+G"][cfg!(target_os = "macos") as usize].to_string(),
            }],
            is_pin_translate_window: false,
            auto_speak: AutoSpeakState::default(),
            current_model: ModelProvider::ZAI,
            api_configs,
        }
    }
}
