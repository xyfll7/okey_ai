use serde::{Deserialize, Serialize};

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
}

impl Default for AppConfig {
    fn default() -> Self {
        AppConfig {
            shortcuts: vec![Shortcut {
                name: "okey_ai".to_string(),
                hot_key: ["Ctrl+G", "Cmd+G"][cfg!(target_os = "macos") as usize].to_string(),
            }],
            is_pin_translate_window: false,
            auto_speak: AutoSpeakState::default(),
            current_model: ModelProvider::ZAI, // 默认模型
        }
    }
}
