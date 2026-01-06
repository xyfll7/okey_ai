use crate::utils::chat_message::ChatMessage;
use crate::utils::{language_detection, translation_manager};
use crate::{my_events::event_names, my_windows, states::setting_states};

use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

#[tauri::command]
pub fn close_main_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("translate")
        .ok_or("Translate window not found")?;
    window
        .destroy()
        .map_err(|e| format!("Failed to close window: {}", e))
}

#[tauri::command(rename_all = "snake_case")]
pub async fn chat(app: AppHandle, chat_message: ChatMessage) -> Result<(), String> {
    let translation_manager = app.state::<translation_manager::TranslationManager>();
    match translation_manager
        .translate(None, &chat_message.content, None, |chat_history| {
            let app_handle = app.clone();
            async move {
                let _ = app_handle.emit(event_names::AI_RESPONSE, &chat_history);
            }
        })
        .await
    {
        Some(chat_histories) => {
            let _ = app.emit(event_names::AI_RESPONSE, &chat_histories);
        }
        None => {
            let error_msg = "翻译失败".to_string();
            let _ = app.emit(event_names::AI_ERROR, error_msg);
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
pub fn toggle_auto_close_translate(state: State<'_, Mutex<setting_states::AppState>>) -> bool {
    let mut app_state = state.lock().unwrap();
    app_state.auto_close_translate = !app_state.auto_close_translate;
    app_state.auto_close_translate
}

#[tauri::command]
pub fn get_auto_close_translate_state(state: State<'_, Mutex<setting_states::AppState>>) -> bool {
    let app_state = state.lock().unwrap();
    app_state.auto_close_translate
}

#[tauri::command]
pub fn toggle_auto_speak(
    state: State<'_, Mutex<setting_states::AppState>>,
) -> setting_states::AutoSpeakState {
    let mut app_state = state.lock().unwrap();
    // Cycle through the three states: Off -> Single -> All -> Off
    app_state.auto_speak = match app_state.auto_speak {
        setting_states::AutoSpeakState::Off => setting_states::AutoSpeakState::Single,
        setting_states::AutoSpeakState::Single => setting_states::AutoSpeakState::All,
        setting_states::AutoSpeakState::All => setting_states::AutoSpeakState::Off,
    };
    app_state.auto_speak
}

#[tauri::command]
pub fn get_auto_speak_state(
    state: State<'_, Mutex<setting_states::AppState>>,
) -> setting_states::AutoSpeakState {
    let app_state = state.lock().unwrap();
    app_state.auto_speak
}

#[tauri::command(rename_all = "snake_case")]
pub async fn command_window_translate_show(app: AppHandle, chat_message: Vec<ChatMessage>) {
    let app_clone = app.clone();
    my_windows::window_translate_show(
        &app,
        Some(move || {
            let _ = app_clone.emit(event_names::AI_RESPONSE, chat_message);
        }),
    );
}

#[tauri::command(rename_all = "snake_case")]
pub async fn translate_specified_text(
    app: AppHandle,
    chat_message: ChatMessage,
) -> Result<(), String> {
    if chat_message.content.is_empty() {
        return Ok(());
    }
    let translation_manager = app.state::<translation_manager::TranslationManager>();
    match translation_manager
        .translate(None, &chat_message.content, None, |chat_history| {
            let app_handle = app.clone();
            async move {
                let _ = app_handle.emit(event_names::AI_RESPONSE, &chat_history);
            }
        })
        .await
    {
        Some(chat_histories) => {
            let _ = app.emit(event_names::AI_RESPONSE, &chat_histories);
        }
        None => {
            let error_msg = "翻译失败".to_string();
            let _ = app.emit(event_names::AI_ERROR, error_msg);
        }
    }
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_histories(
    app: AppHandle,
) -> Result<
    std::collections::BTreeMap<String, crate::utils::chat_message::ChatMessageHistory>,
    String,
> {
    let translation_manager = app.state::<translation_manager::TranslationManager>();
    let histories = translation_manager.get_histories().await;
    let all_histories = histories.get_all_histories().await;
    println!("=== Ordered keys ===");
    for (key, item) in all_histories.iter() {
        println!("{},{:#?}", key, item);
    }
    Ok(all_histories)
}
