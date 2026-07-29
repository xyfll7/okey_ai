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

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
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
    pub prompt_tags: Vec<PromptTag>,
}

/// Build the default prompt tags localized for the given locale.
/// Labels and contents are loaded from the i18n locale files so a fresh
/// install (no `store.json`) starts in the user's system language.
fn default_prompt_tags(locale: &str) -> Vec<PromptTag> {
    vec![
        PromptTag { raw: None, label: Some(rust_i18n::t!("prompt_tag_system_label", locale = locale).to_string()), content: Some(rust_i18n::t!("prompt_tag_system_content", locale = locale).to_string()), id: Some(0) },
        PromptTag { raw: None, label: Some(rust_i18n::t!("prompt_tag_summary_label", locale = locale).to_string()), content: Some(rust_i18n::t!("prompt_tag_summary_content", locale = locale).to_string()), id: Some(1) },
        PromptTag { raw: None, label: Some(rust_i18n::t!("prompt_tag_right_ctrl_label", locale = locale).to_string()), content: Some(rust_i18n::t!("prompt_tag_right_ctrl_content", locale = locale).to_string()), id: Some(2) },
        PromptTag { raw: None, label: Some(rust_i18n::t!("prompt_tag_self_explanation_label", locale = locale).to_string()), content: Some(rust_i18n::t!("prompt_tag_self_explanation_content", locale = locale).to_string()), id: Some(3) },
        PromptTag { raw: None, label: Some(rust_i18n::t!("prompt_tag_word_details_label", locale = locale).to_string()), content: Some(rust_i18n::t!("prompt_tag_word_details_content", locale = locale).to_string()), id: Some(4) },
        PromptTag { raw: None, label: Some(rust_i18n::t!("prompt_tag_meaning_context_label", locale = locale).to_string()), content: Some(rust_i18n::t!("prompt_tag_meaning_context_content", locale = locale).to_string()), id: Some(5) },
        PromptTag { raw: None, label: Some(rust_i18n::t!("prompt_tag_detailed_explanation_label", locale = locale).to_string()), content: Some(rust_i18n::t!("prompt_tag_detailed_explanation_content", locale = locale).to_string()), id: Some(6) },
    ]
}

impl Default for AppConfig {
    fn default() -> Self {
        dotenvy::dotenv().ok();
        let locale = crate::utils::i18n::get_default_locale();
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
            prompt_tags: default_prompt_tags(&locale),
        }
    }
}
