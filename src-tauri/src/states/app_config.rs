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

/// 支持的语言选项
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
pub enum Language {
    #[serde(rename = "auto")]
    #[default]
    Auto,
    #[serde(rename = "zh-CN")]
    ZhCn,
    #[serde(rename = "en")]
    En,
}

impl Language {
    pub fn to_locale(&self) -> String {
        match self {
            Language::Auto => crate::utils::i18n::get_default_locale(),
            Language::ZhCn => "zh-CN".to_string(),
            Language::En => "en".to_string(),
        }
    }

    pub fn to_display_name(&self) -> &'static str {
        match self {
            Language::Auto => "Auto",
            Language::ZhCn => "Chinese",
            Language::En => "English",
        }
    }

    pub fn effective_language(&self) -> Self {
        match self {
            Language::Auto => Language::from_locale(&crate::utils::i18n::get_default_locale()),
            _ => *self,
        }
    }

    pub fn from_locale(locale: &str) -> Self {
        match locale {
            "zh-CN" => Language::ZhCn,
            "en" => Language::En,
            _ => Language::Auto,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Prompts {
    pub system_prompt: String,
    pub translate_into: String,
    pub summary_prompt: String,
}

impl Default for Prompts {
    fn default() -> Self {
        Prompts {
            system_prompt: "You are a professional translation assistant. Please accurately translate the language, preserving the original meaning and tone.".to_string(),
            translate_into: "Please translate the following text into {target}:\n\n{text}".to_string(),
            summary_prompt: "Please analyze the following text and provide a summary:\n\n{text}".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptTag {
    pub raw: Option<String>,
    pub label: Option<String>,
    pub content: Option<String>,
    pub id: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AppConfig {
    pub shortcuts: Vec<Shortcut>,
    pub is_pin_translate_window: bool,
    pub auto_speak: AutoSpeakState,
    pub current_model: ModelProvider,
    pub api_configs: HashMap<ModelProvider, APIConfig>,
    pub language: Language,
    pub local_language: Language,
    pub target_language: Language,
    pub self_explaining_model: bool,
    pub prompts: Prompts,
    pub prompt_tags: Vec<PromptTag>,
}

impl Default for AppConfig {
    fn default() -> Self {
        dotenvy::dotenv().ok();
        let mut api_configs = HashMap::new();
        api_configs.insert(ModelProvider::OpenAI, APIConfig { api_key: std::env::var("OPENAI_API_KEY").unwrap_or_else(|_| "".to_string()), base_url: "https://api.openai.com/v1".to_string(), model: "gpt-4".to_string(), index: 0 });
        api_configs.insert(ModelProvider::Qwen, APIConfig { api_key: std::env::var("QWEN_API_KEY").unwrap_or_else(|_| "".to_string()), base_url: "https://dashscope.aliyuncs.com".to_string(), model: "qwen3.6-plus".to_string(), index: 1 });
        api_configs.insert(ModelProvider::DeepSeek, APIConfig { api_key: std::env::var("DEEPSEEK_API_KEY").unwrap_or_else(|_| "".to_string()), base_url: "https://api.deepseek.com".to_string(), model: "deepseek-v4-flash".to_string(), index: 2 });
        api_configs.insert(ModelProvider::ZAI, APIConfig { api_key: std::env::var("ZAI_API_KEY").unwrap_or_else(|_| "".to_string()), base_url: "https://open.bigmodel.cn/api/paas/v4".to_string(), model: "glm-4.7".to_string(), index: 3 });
        AppConfig {
            shortcuts: vec![Shortcut { name: "okey_ai".to_string(), hot_key: ["Ctrl+G", "Cmd+G"][cfg!(target_os = "macos") as usize].to_string() }],
            is_pin_translate_window: false,
            auto_speak: AutoSpeakState::default(),
            current_model: ModelProvider::DeepSeek,
            api_configs,
            language: Language::default(),
            local_language: if cfg!(debug_assertions) { Language::ZhCn } else { Language::Auto.effective_language() },
            target_language: Language::Auto.effective_language(),
            self_explaining_model: false,
            prompts: Prompts::default(),
            #[rustfmt::skip]
            prompt_tags: vec![
                PromptTag { raw: None, label: Some("自解释".to_string()), content: Some("Please explain the following text in {target}, as if explaining to a language learner:\n\n{text}.".to_string()), id: Some(1) }, 
                PromptTag { raw: None, label: Some("单词详解".to_string()), content: Some("Please use {local} to explain the word {text} in detail.".to_string()), id: Some(2) }, 
                PromptTag { raw: None, label: Some("在句中的含义".to_string()), content: Some("Please use {local} to explain the meaning of {text} in the sentence.".to_string()), id: Some(3) }, 
                PromptTag { raw: None, label: Some("详解".to_string()), content: Some("Please explain the following content in detail in {local}: {text}".to_string()), id: Some(4) }, 
            ],
        }
    }
}
