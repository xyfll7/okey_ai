mod my_api;
mod my_command;
mod my_reqwest;
mod my_shortcut;
mod my_tray;
mod my_windows;

use std::sync::{Arc, Mutex};
use tauri::async_runtime::RwLock;

// Global state struct for auto-close window setting
#[derive(Default)]
pub struct AppState {
    pub auto_close_window: bool,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let api_manager = Arc::new(RwLock::new(crate::my_api::manager::APIManager::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .manage(Mutex::new(AppState::default()))
        .manage(crate::my_api::commands::GlobalAPIManager(api_manager))
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            my_reqwest::http_get_example,
            my_reqwest::http_post_example,
            my_command::greet,
            my_command::get_selection_text,
            my_command::toggle_auto_close_window,
            my_command::get_auto_close_window_state,
            my_command::close_main_window,
            crate::my_api::commands::initialize_api_manager,
            crate::my_api::commands::switch_model,
            crate::my_api::commands::get_current_model,
            crate::my_api::commands::list_models,
            crate::my_api::commands::chat_completion,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 初始化 API 管理器
            crate::my_api::setup_api_manager(&app.handle())?;

            my_shortcut::setup_shortcuts(&app.handle())?;
            my_tray::create_tray(&app.handle())?;

            // 在 macOS 上隐藏 Dock 栏图标
            #[cfg(target_os = "macos")]
            {
                use tauri::ActivationPolicy;
                app.set_activation_policy(ActivationPolicy::Accessory);
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                api.prevent_exit();
            }
        })
}
