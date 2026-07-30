use crate::states::app_config::ModelProvider;
use serde_json::json;

/// Declarative description of a provider's OpenAI-compatible quirks.
///
/// Every provider in this app is OpenAI-compatible, so they are all served by
/// the same `rig::providers::openai::CompletionsClient`. The *only* differences
/// between providers are expressed here as **data**, not as scattered `match`
/// statements inside the client builder. Adding or tweaking a provider becomes
/// a pure data change and can never accidentally flip the request endpoint.
#[derive(Clone)]
pub struct ProviderPreset {
    /// Optional path appended to `base_url` for providers whose OpenAI
    /// compatible endpoint lives under a sub-path (e.g. Qwen's
    /// `/compatible-mode/v1`). Only added when not already present, so a user
    /// who pastes the full endpoint still works.
    pub url_suffix: Option<&'static str>,
    /// Extra request parameters applied to every completion request for this
    /// provider (e.g. disabling thinking on Qwen).
    pub extra_params: serde_json::Value,
}

/// Look up the preset for a given provider. `Custom(_)` providers are treated
/// as plain OpenAI-compatible endpoints with no special handling.
pub fn preset_for(provider: &ModelProvider) -> ProviderPreset {
    match provider {
        ModelProvider::Qwen => ProviderPreset {
            url_suffix: Some("/compatible-mode/v1"),
            extra_params: json!({ "enable_thinking": false }),
        },
        ModelProvider::ZAI => ProviderPreset {
            url_suffix: None,
            extra_params: json!({ "thinking": { "type": "disabled" } }),
        },
        // OpenAI, DeepSeek, Custom and any future provider: plain OpenAI-compatible.
        _ => ProviderPreset {
            url_suffix: None,
            extra_params: json!({}),
        },
    }
}

/// Resolve the base URL rig will POST `{base_url}/chat/completions` against.
///
/// This folds in the provider's path quirk and also tolerates users who paste
/// the full endpoint (e.g. `.../v1/chat/completions`) by stripping known
/// suffixes, so the join is always well-formed and never double-prefixed.
pub fn resolve_base_url(raw: &str, preset: &ProviderPreset) -> String {
    let trimmed = raw.trim_end_matches('/');
    let mut url = trimmed
        .strip_suffix("/chat/completions")
        .unwrap_or(trimmed)
        .to_string();
    if let Some(suffix) = preset.url_suffix {
        if !url.ends_with(suffix) {
            url.push_str(suffix);
        }
    }
    url
}
