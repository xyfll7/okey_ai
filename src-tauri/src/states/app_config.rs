use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Eq, Hash, PartialEq)]
pub enum ModelType {
    Qwen,
    DeepSeek,
    OpenAI,
    ZAI,
    Custom(String),
}

impl ModelType {
    pub fn as_str(&self) -> &str {
        match self {
            ModelType::Qwen => "Qwen AI",
            ModelType::DeepSeek => "DeepSeek",
            ModelType::OpenAI => "OpenAI",
            ModelType::ZAI => "Z AI",
            ModelType::Custom(name) => name,
        }
    }

    pub fn from_str(s: &str) -> ModelType {
        match s {
            "Qwen AI" => ModelType::Qwen,
            "DeepSeek" => ModelType::DeepSeek,
            "OpenAI" => ModelType::OpenAI,
            "Z AI" => ModelType::ZAI,
            _ => ModelType::Custom(s.to_string()),
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
    pub current_model: ModelType,
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
            current_model: ModelType::ZAI, // 默认模型
        }
    }
}
