use selection::get_text;
use std::sync::Mutex;
use tauri::{async_runtime, AppHandle, Emitter, Manager, State};

use crate::{
    my_api::{
        commands::GlobalAPIManager,
        traits::{ChatCompletionRequest, ChatMessage},
    },
    my_windows::create_or_show_main_window,
    types::InputData,
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

#[tauri::command(rename_all = "snake_case")]
pub fn chat(app: AppHandle, input_data: InputData) {
    let app_clone = app.clone();
    let input_text_clone = input_data.input_text.clone(); // Clone the input_text before it gets moved
    async_runtime::spawn(async move {
        let api_manager_state = app_clone.state::<GlobalAPIManager>();
        let request = ChatCompletionRequest {
            model: "qwen-plus".to_string(),
            messages: vec![ChatMessage {
                role: "user".to_string(),
                content: input_text_clone, // Use the cloned value
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
                    let app_handle_clone = app_clone.clone();
                    create_or_show_main_window(
                        &app_clone,
                        Some(move || {
                            let input_data = InputData {
                                input_time_stamp: input_data.input_time_stamp.clone(),
                                input_text: input_data.input_text.clone(),
                                response_text: Some(content),
                            };
                            let _ = app_handle_clone.emit("ai_response", input_data);
                        }),
                    );
                }
            }
            Err(e) => {
                let app_clone_clone = app_clone.clone();
                let error_msg = e.to_string();
                create_or_show_main_window(
                    &app_clone,
                    Some(move || {
                        let _ = app_clone_clone.emit("ai-error", error_msg);
                    }),
                );
            }
        }
    });
}
