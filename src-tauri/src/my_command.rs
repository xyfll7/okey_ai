use selection::get_text;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

use crate::AppState;

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
