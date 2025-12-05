use selection::get_text;
use std::sync::Mutex;
use tauri::{async_runtime, AppHandle, Emitter, Manager, State};

use crate::{
    my_api::{
        commands::GlobalAPIManager,
        traits::{ChatCompletionRequest, ChatMessage},
    },
    my_windows::create_or_show_main_window,
    AppState,
};

#[tauri::command]
pub fn greet(name: &str) -> String {
    println!("greeted {}", name);
    return format!("Hello, {}! You've been greeted from Rust!", name);
}

#[tauri::command]
pub fn get_selection_text() -> String {
    let text = get_text();
    println!("{}", text);
    text
}

#[tauri::command]
pub fn toggle_auto_close_window(state: State<'_, Mutex<AppState>>) -> bool {
    let mut app_state = state.lock().unwrap();
    app_state.auto_close_window = !app_state.auto_close_window;
    println!("auto_close_window: {}", app_state.auto_close_window);
    app_state.auto_close_window
}

#[tauri::command]
pub fn get_auto_close_window_state(state: State<'_, Mutex<AppState>>) -> bool {
    let app_state = state.lock().unwrap();
    app_state.auto_close_window
}

#[tauri::command]
pub fn close_main_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;
    window
        .destroy()
        .map_err(|e| format!("Failed to close window: {}", e))
}

#[tauri::command]
pub fn chat(app_handle: AppHandle, message: String) {
    let app_handle = app_handle.clone();
    let _message = message.clone(); // Clone the message before it gets moved
    async_runtime::spawn(async move {
        let api_manager_state = app_handle.state::<GlobalAPIManager>();
        let request = ChatCompletionRequest {
            model: "qwen-plus".to_string(),
            messages: vec![ChatMessage {
                role: "user".to_string(),
                content: message, // message is moved here
            }],
            temperature: Some(0.1),
            max_tokens: Some(500),
            top_p: Some(1.0),
            stream: None,
        };

        match crate::my_api::commands::chat_completion(request, api_manager_state).await {
            Ok(response) => {
                if let Some(choice) = response.choices.first() {
                    let content = choice.message.content.clone(); // Clone the content to own it
                    let _message = _message; // Use the pre-cloned selected_text
                    let app_handle_clone = app_handle.clone();
                    create_or_show_main_window(
                        &app_handle,
                        Some(move || {
                            let response_data = serde_json::json!({
                                "content": content,
                                "message": _message
                            });
                            let _ = app_handle_clone.emit("ai-response", response_data);
                        }),
                    );
                }
            }
            Err(e) => {
                let app_handle_clone = app_handle.clone();
                let error_msg = e.to_string();
                create_or_show_main_window(
                    &app_handle,
                    Some(move || {
                        let _ = app_handle_clone.emit("ai-error", error_msg);
                    }),
                );
            }
        }
    });
}
