use crate::utils::chat_message::{ChatMessage, Role};
use crate::utils::{language_detection, translation_manager};
use crate::{
    my_api::{commands::GlobalAPIManager, traits::ChatCompletionRequest},
    my_events::event_names,
    my_windows,
    states::setting_states,
};
use selection::get_text;
use std::sync::Mutex;
use tauri::{async_runtime, AppHandle, Emitter, Manager, State};

#[tauri::command]
pub fn get_selection_text() -> String {
    let text = get_text();
    println!("{}", text);
    text
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
pub fn chat(app: AppHandle, chat_message: ChatMessage) {
    let app_clone = app.clone();
    let input_text_clone = chat_message.content.clone(); // Clone the content before it gets moved
    let input_text_for_callback = chat_message.content.clone(); // Clone again for use in the callback closure
    let chat_msg = ChatMessage {
        role: Role::User,
        content: input_text_clone, // 你的内容
        raw: None,
    };
    async_runtime::spawn(async move {
        let api_manager_state = app_clone.state::<GlobalAPIManager>();
        let request = ChatCompletionRequest {
            model: "qwen-plus".to_string(),
            messages: vec![chat_msg.as_llm()],
            temperature: Some(0.1),
            max_tokens: Some(500),
            top_p: Some(1.0),
            stream: None,
        };

        match crate::my_api::commands::chat_completion(request, api_manager_state).await {
            Ok(response) => {
                if let Some(choice) = response.choices.first() {
                    let app_handle_clone = app_clone.clone();
                    let chat_message = ChatMessage {
                        role: Role::User,
                        content: input_text_for_callback,
                        raw: None,
                    };
                    let _ = app_handle_clone.emit(event_names::AI_RESPONSE, chat_message);
                }
            }
            Err(e) => {
                let app_clone_clone = app_clone.clone();
                let error_msg = e.to_string();
                my_windows::window_translate_show(
                    &app_clone,
                    Some(move || {
                        let _ = app_clone_clone.emit(event_names::AI_ERROR, error_msg);
                    }),
                );
            }
        }
    });
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
pub async fn translate_specified_text(app: AppHandle, specified_text: &str) -> Result<(), String> {
    if specified_text.is_empty() {
        return Ok(());
    }
    let translation_manager = app.state::<translation_manager::TranslationManager>();
    match translation_manager
        .translate(None, specified_text, None, |_| async {})
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
