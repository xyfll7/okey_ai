mod my_api;
mod my_command;
mod my_config;
mod my_events;
mod my_logging;
mod my_reqwest;
mod my_shortcut;
mod my_test;
mod my_tray;
mod my_types;
mod my_utils;
mod my_windows;
use std::sync::{Arc, Mutex};
use tauri::async_runtime::RwLock;
use tauri_plugin_notification::NotificationExt;
// Enum for auto speak state - three possible states
#[derive(Default, Clone, Copy, PartialEq)]
pub enum AutoSpeakState {
    Off, // Completely off
    #[default]
    Single, // Read single word
    All, // Read full sentence
}

use serde::Serialize;

// Implement Display and Serialize for AutoSpeakState to return string values
impl std::fmt::Display for AutoSpeakState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AutoSpeakState::Off => write!(f, "off"),
            AutoSpeakState::Single => write!(f, "single"),
            AutoSpeakState::All => write!(f, "all"),
        }
    }
}

impl Serialize for AutoSpeakState {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

// Global state struct for auto-close window setting
#[derive(Default)]
pub struct AppState {
    pub auto_close_window: bool,
    pub auto_speak: AutoSpeakState,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let api_manager = Arc::new(RwLock::new(crate::my_api::manager::APIManager::new()));
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            app.notification()
                .builder()
                .title("okey.ai")
                .body("okey.ai is running!")
                .show()
                .unwrap();
        }))
        .manage(Mutex::new(AppState::default()))
        .manage(crate::my_api::commands::GlobalAPIManager(api_manager))
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            my_command::get_selection_text,
            my_command::toggle_auto_close_window,
            my_command::get_auto_close_window_state,
            my_command::toggle_auto_speak,
            my_command::get_auto_speak_state,
            my_command::close_main_window,
            my_command::chat,
            my_command::detect_language,
            my_shortcut::register_hotkey_okey_ai,
            my_shortcut::register_hotkey_okey_ai,
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
                        .filter(crate::my_logging::log_filter)
                        .build(),
                )?;
            }
            // 初始化 API 管理器
            crate::my_api::setup_api_manager(&app.handle())?;
            my_config::init_global_config(&app.handle())?;
            my_test::set_shortcuts(&app.handle())?;
            my_shortcut::init_shortcuts(&app.handle())?;
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
