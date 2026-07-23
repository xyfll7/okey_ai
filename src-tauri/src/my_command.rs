use crate::my_api::traits::APIConfig;
use crate::states::app_config::{AutoSpeakState, Language, ModelProvider, PromptTag};
use crate::states::app_state::AppConfigState;
use crate::states::chatting_state::ChattingState;
use crate::utils::chat_message::{ChatMessage, ChatMessageHistory, Role};
use crate::utils::{language_detection, translation_manager};
use crate::{my_events::event_names, my_windows};

use serde::{Deserialize, Serialize};
use tauri::{ipc::Channel, AppHandle, Emitter, Manager};

#[tauri::command]
pub async fn abort_chat_stream(app: AppHandle) -> Result<(), String> {
    let translation_manager = app.state::<translation_manager::TranslationManager>();
    let api_manager = translation_manager.get_api_manager().await;
    let guard = api_manager.read().await;
    let result = guard.abort_chat_stream().await;
    result
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_chatting_state(app: AppHandle) -> bool {
    let chatting_state = app.state::<ChattingState>();
    chatting_state.get()
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum StreamEvent {
    Chunk { content: String },
    Done,
    Error { message: String },
}

#[tauri::command]
pub fn close_main_window(app: AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("translate").ok_or("Translate window not found")?;
    window.destroy().map_err(|e| format!("Failed to close window: {}", e))
}

#[tauri::command(rename_all = "snake_case")]
pub async fn chat_stream(app: AppHandle, prompt_tag: PromptTag, on_event: Channel<StreamEvent>) -> Result<(), String> {
    let translation_manager = app.state::<translation_manager::TranslationManager>();
    let chatting_state = app.state::<ChattingState>().inner().clone();
    let on_event_clone = on_event.clone();
    let chatting_state_clone = chatting_state.clone();
    println!("看看我执行了几次11");
    let messages = if prompt_tag.content.as_deref().unwrap_or_default().trim().is_empty() {
        translation_manager.get_current_history().await.unwrap_or_default()
    } else {
        let raw = prompt_tag.raw.clone().unwrap_or_default();
        let content_template = prompt_tag.content.as_deref().unwrap_or_default();
        let detected_lang = if raw.is_empty() {
            String::new()
        } else {
            let detected = language_detection::detect_language(&raw);
            Language::from_locale(detected).to_display_name().to_string()
        };
        let local = app.state::<AppConfigState>().read().local_language.effective_language().to_display_name().to_string();
        let assembled = content_template.replace("{detected_lang}", &detected_lang).replace("{local}", &local).replace("{text}", &raw);
        let messages = translation_manager.add_get_user_message(None, &assembled, None, Role::User).await.unwrap_or_default();
        let _ = app.emit(event_names::CHAT_HISTORY_UPDATE, &messages);
        messages
    };
    chatting_state_clone.set(true);
    let chat_histories = translation_manager
        .translate_stream(None, messages, move |chunk_content| {
            let _ = on_event_clone.send(StreamEvent::Chunk { content: chunk_content.clone() });
        })
        .await;
    match chat_histories {
        Ok(chat_histories) => {
            chatting_state.set(false);
            let _ = app.emit(event_names::CHAT_HISTORY_UPDATE, &chat_histories);
            let _ = on_event.send(StreamEvent::Done);
        }
        Err(err) => {
            chatting_state.set(false);
            log::error!("[my_command::chat_stream] Translation failed: {}", err);
            let _ = on_event.send(StreamEvent::Error { message: err });
        }
    }
    Ok(())
}

#[tauri::command]
pub fn detect_language(text: &str) -> String {
    let language = language_detection::detect_language(text);
    language.to_string()
}

#[tauri::command]
pub fn is_pin_translate_window_toggle(app: AppHandle) -> Result<bool, String> {
    let app_state = app.state::<AppConfigState>();

    app_state
        .update(|config| {
            config.is_pin_translate_window = !config.is_pin_translate_window;
        })
        .map_err(|e| e.to_string())?;

    let config = app_state.read();
    Ok(config.is_pin_translate_window)
}

#[tauri::command]
pub fn is_pin_translate_window_get(app: AppHandle) -> bool {
    let app_state = app.state::<AppConfigState>();
    let config = app_state.read();
    config.is_pin_translate_window
}

#[tauri::command]
pub fn toggle_auto_speak(app: AppHandle) -> Result<AutoSpeakState, String> {
    let app_state = app.state::<AppConfigState>();

    app_state
        .update(|config| {
            config.auto_speak = match config.auto_speak {
                AutoSpeakState::Off => AutoSpeakState::Single,
                AutoSpeakState::Single => AutoSpeakState::All,
                AutoSpeakState::All => AutoSpeakState::Off,
            };
        })
        .map_err(|e| e.to_string())?;

    let config = app_state.read();
    Ok(config.auto_speak)
}

#[tauri::command]
pub fn get_auto_speak_state(app: AppHandle) -> AutoSpeakState {
    let app_state = app.state::<AppConfigState>();
    let config = app_state.read();
    config.auto_speak
}

#[tauri::command]
pub fn get_language_options() -> Vec<(String, String)> {
    use crate::states::app_config::Language;
    vec![(Language::ZhCn.to_locale(), Language::ZhCn.to_display_name().to_string()), (Language::En.to_locale(), Language::En.to_display_name().to_string())]
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_local_language(app: AppHandle) -> Language {
    let app_state = app.state::<AppConfigState>();
    let config = app_state.read();
    config.local_language
}

#[tauri::command(rename_all = "snake_case")]
pub fn set_local_language(app: AppHandle, language: Language) -> Result<Language, String> {
    let app_state = app.state::<AppConfigState>();
    app_state
        .update(|config| {
            config.local_language = language;
        })
        .map_err(|e| e.to_string())?;
    Ok(language)
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_target_language(app: AppHandle) -> Language {
    let app_state = app.state::<AppConfigState>();
    let config = app_state.read();
    config.target_language
}

#[tauri::command(rename_all = "snake_case")]
pub fn set_target_language(app: AppHandle, language: Language) -> Result<Language, String> {
    let app_state = app.state::<AppConfigState>();
    app_state
        .update(|config| {
            config.target_language = language;
        })
        .map_err(|e| e.to_string())?;
    Ok(language)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn window_translate_show(app: AppHandle, chat_message: Vec<ChatMessage>) {
    let app_clone = app.clone();
    my_windows::window_translate_show(
        &app,
        Some(move || {
            let _ = app_clone.emit(event_names::CHAT_HISTORY_UPDATE, chat_message);
        }),
    );
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_histories(app: AppHandle) -> Result<Vec<(String, ChatMessageHistory)>, String> {
    let translation_manager = app.state::<translation_manager::TranslationManager>();
    let histories = translation_manager.get_histories().await;
    let mut histories_vec: Vec<_> = histories.into_iter().collect();
    histories_vec.reverse();
    Ok(histories_vec)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_current_history(app: AppHandle) -> Result<Vec<ChatMessage>, String> {
    let translation_manager = app.state::<translation_manager::TranslationManager>();
    let histories = translation_manager.get_histories().await;
    if histories.is_empty() {
        translation_manager.create_session().await;
    }
    let history = translation_manager.get_current_history().await;
    match history {
        Some(history) => Ok(history),
        None => Err("No active session history found".to_string()),
    }
}

#[tauri::command(rename_all = "snake_case")]
pub async fn set_current_session(app: AppHandle, session_id: String) -> Result<(), String> {
    let translation_manager = app.state::<translation_manager::TranslationManager>();
    translation_manager.set_active_session(&session_id).await;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn create_new_session(app: AppHandle) -> Result<(), String> {
    let translation_manager = app.state::<translation_manager::TranslationManager>();
    translation_manager.create_session().await;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn update_model_api_key(app: AppHandle, model_name: String, api_key: String) -> Result<(), String> {
    let app_state = app.state::<AppConfigState>();
    let model_provider: ModelProvider = serde_json::from_str(&format!("\"{}\"", model_name)).map_err(|e| format!("Failed to parse model: {}", e))?;

    app_state
        .update(|config| {
            let abc = config
                .api_configs
                .iter()
                .map(|(provider, api_config)| {
                    let updated_api_config = if *provider == model_provider { APIConfig { api_key: api_key.clone(), ..api_config.clone() } } else { api_config.clone() };
                    (provider.clone(), updated_api_config)
                })
                .collect();
            config.api_configs = abc;
        })
        .map_err(|e| e.to_string())?;

    crate::my_api::refresh_api_clients_from_app_config(&app).await;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_self_explaining_model(app: AppHandle) -> bool {
    let app_state = app.state::<AppConfigState>();
    let config = app_state.read();
    config.self_explaining_model
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_prompt_tags(app: AppHandle) -> Vec<PromptTag> {
    let app_state = app.state::<AppConfigState>();
    let config = app_state.read();
    config.prompt_tags.clone()
}

#[tauri::command(rename_all = "snake_case")]
pub fn delete_prompt_tag(app: AppHandle, id: u32) -> Result<Vec<PromptTag>, String> {
    let app_state = app.state::<AppConfigState>();
    app_state
        .update(|config| {
            config.prompt_tags.retain(|tag| tag.id != Some(id));
        })
        .map_err(|e| e.to_string())?;
    let tags = app_state.read().prompt_tags.clone();
    Ok(tags)
}

#[tauri::command(rename_all = "snake_case")]
pub fn add_prompt_tag(app: AppHandle, label: String, content: String) -> Result<Vec<PromptTag>, String> {
    let app_state = app.state::<AppConfigState>();
    app_state
        .update(|config| {
            let next_id = config.prompt_tags.iter().map(|t| t.id.unwrap_or(0)).max().unwrap_or(0) + 1;
            config.prompt_tags.push(PromptTag { label: Some(label), content: Some(content), id: Some(next_id), raw: None });
        })
        .map_err(|e| e.to_string())?;
    let tags = app_state.read().prompt_tags.clone();
    Ok(tags)
}

#[tauri::command(rename_all = "snake_case")]
pub fn set_self_explaining_model(app: AppHandle, enabled: bool) -> Result<bool, String> {
    let app_state = app.state::<AppConfigState>();
    app_state
        .update(|config| {
            config.self_explaining_model = enabled;
        })
        .map_err(|e| e.to_string())?;
    Ok(enabled)
}
