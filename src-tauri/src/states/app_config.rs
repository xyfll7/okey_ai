use crate::my_api::traits::APIConfig;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Eq, Hash, PartialEq)]
pub enum ModelProvider {
    Qwen,
    DeepSeek,
    OpenAI,
    ZAI,
    Custom(String),
}

impl ModelProvider {
    pub fn as_str(&self) -> &str {
        match self {
            ModelProvider::Qwen => "Qwen AI",
            ModelProvider::DeepSeek => "DeepSeek",
            ModelProvider::OpenAI => "OpenAI",
            ModelProvider::ZAI => "Z AI",
            ModelProvider::Custom(name) => name,
        }
    }

    pub fn from_str(s: &str) -> ModelProvider {
        match s {
            "Qwen AI" => ModelProvider::Qwen,
            "DeepSeek" => ModelProvider::DeepSeek,
            "OpenAI" => ModelProvider::OpenAI,
            "Z AI" => ModelProvider::ZAI,
            _ => ModelProvider::Custom(s.to_string()),
        }
    }
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
        let mut api_configs = HashMap::new();

        api_configs.insert(
            ModelProvider::OpenAI,
            APIConfig {
                api_key: "your-openai-api-key".to_string(),
                base_url: "https://api.openai.com/v1".to_string(),
                model: "gpt-4".to_string(),
            },
        );

        api_configs.insert(
            ModelProvider::Qwen,
            APIConfig {
                api_key: "sk-3ab003e0b90346e58d4072f402a15b13".to_string(),
                base_url: "https://dashscope.aliyuncs.com".to_string(),
                model: "qwen-plus".to_string(),
            },
        );

        api_configs.insert(
            ModelProvider::DeepSeek,
            APIConfig {
                api_key: "sk-ae24d74445814224b94553fc5228b569".to_string(),
                base_url: "https://api.deepseek.com".to_string(),
                model: "deepseek-chat".to_string(),
            },
        );

        api_configs.insert(
            ModelProvider::ZAI,
            APIConfig {
                api_key: "9899af6115c74c1e8ca3eb4bc68e92ba.FCIVu4e7Oz0tNqmP".to_string(), // 智谱AI的API密钥
                base_url: "https://open.bigmodel.cn/api/paas/v4".to_string(), // 智谱AI的API基础URL
                model: "glm-4.7".to_string(),                                 // 智谱AI的模型
            },
        );

        AppConfig {
            shortcuts: vec![Shortcut {
                name: "okey_ai".to_string(),
                hot_key: ["Ctrl+G", "Cmd+G"][cfg!(target_os = "macos") as usize].to_string(),
            }],
            is_pin_translate_window: false,
            auto_speak: AutoSpeakState::default(),
            current_model: ModelProvider::ZAI, // 默认模型
            api_configs,
        }
    }
}
