use crate::states::app_config::AutoSpeakState;
use crate::states::app_state::AppConfigState;
use crate::utils::chat_message::ChatMessage;
use crate::utils::{language_detection, translation_manager};
use crate::{my_events::event_names, my_windows};

use serde::{Deserialize, Serialize};
use tauri::{ipc::Channel, AppHandle, Emitter, Manager};

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum StreamEvent {
    Chunk { content: String },
    Done,
    Error { message: String },
}

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
pub async fn chat_stream(
    app: AppHandle,
    chat_message: ChatMessage,
    on_event: Channel<StreamEvent>,
) -> Result<(), String> {
    let translation_manager = app.state::<translation_manager::TranslationManager>();
    let content_clone = chat_message.content.clone();
    let on_event_clone = on_event.clone();

    match translation_manager
        .translate_stream(
            None,
            &content_clone,
            None,
            |chat_history| {
                let app_handle = app.clone();
                async move {
                    let _ = app_handle.emit(event_names::AI_RESPONSE, &chat_history);
                }
            },
            move |chunk_content| {
                let _ = on_event_clone.send(StreamEvent::Chunk {
                    content: chunk_content.clone(),
                });
            },
        )
        .await
    {
        Some(chat_histories) => {
            let _ = app.emit(event_names::AI_RESPONSE, &chat_histories);
            let _ = on_event.send(StreamEvent::Done);
        }
        None => {
            let _ = on_event.send(StreamEvent::Error {
                message: "翻译失败".to_string(),
            });
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
    let app_state = app.state::<AppConfigState<tauri::Wry>>();

    // Use the update method to modify and save in one operation
    app_state
        .update(|config| {
            config.is_pin_translate_window = !config.is_pin_translate_window;
        })
        .map_err(|e| e.to_string())?;

    // Return the new state by reading it again
    let config = app_state.read();
    Ok(config.is_pin_translate_window)
}

#[tauri::command]
pub fn is_pin_translate_window_get(app: AppHandle) -> bool {
    let app_state = app.state::<AppConfigState<tauri::Wry>>();
    let config = app_state.read();
    config.is_pin_translate_window
}

#[tauri::command]
pub fn toggle_auto_speak(app: AppHandle) -> Result<AutoSpeakState, String> {
    let app_state = app.state::<AppConfigState<tauri::Wry>>();

    // Use the update method to modify and save in one operation
    app_state
        .update(|config| {
            // Cycle through the three states: Off -> Single -> All -> Off
            config.auto_speak = match config.auto_speak {
                AutoSpeakState::Off => AutoSpeakState::Single,
                AutoSpeakState::Single => AutoSpeakState::All,
                AutoSpeakState::All => AutoSpeakState::Off,
            };
        })
        .map_err(|e| e.to_string())?;

    // Return the new state by reading it again
    let config = app_state.read();
    Ok(config.auto_speak)
}

#[tauri::command]
pub fn get_auto_speak_state(app: AppHandle) -> AutoSpeakState {
    let app_state = app.state::<AppConfigState<tauri::Wry>>();
    let config = app_state.read();
    config.auto_speak
}

#[tauri::command(rename_all = "snake_case")]
pub async fn window_translate_show(app: AppHandle, chat_message: Vec<ChatMessage>) {
    let app_clone = app.clone();
    my_windows::window_translate_show(
        &app,
        Some(move || {
            let _ = app_clone.emit(event_names::AI_RESPONSE, chat_message);
        }),
    );
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_histories(
    app: AppHandle,
) -> Result<Vec<(String, crate::utils::chat_message::ChatMessageHistory)>, String> {
    let translation_manager = app.state::<translation_manager::TranslationManager>();
    let histories = translation_manager.get_histories().await;
    let mut histories_vec: Vec<_> = histories.into_iter().collect();
    histories_vec.reverse();
    Ok(histories_vec)
}
