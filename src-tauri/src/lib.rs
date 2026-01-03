mod my_api;
mod my_command;
mod my_config;
mod my_events;
mod my_logging;
mod my_modifier_keys;
mod my_rdev;
mod my_shortcut;
mod my_test;
mod my_tray;
mod my_types;
mod my_windows;
mod states;
mod utils;

use states::chat_histories;
use states::setting_states;
use tauri::Manager; // ← 添加这一行，非常重要！
use tauri_plugin_notification::NotificationExt;
use utils::translation_manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let api_manager = std::sync::Arc::new(tauri::async_runtime::RwLock::new(
        my_api::manager::APIManager::new(),
    ));
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
        .manage(std::sync::Mutex::new(setting_states::AppState::default()))
        .manage(chat_histories::GlobalChatHistories::new())
        .manage(my_api::commands::GlobalAPIManager(api_manager))
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            my_command::toggle_auto_close_translate,
            my_command::get_auto_close_translate_state,
            my_command::toggle_auto_speak,
            my_command::get_auto_speak_state,
            my_command::command_window_translate_show,
            my_command::close_main_window,
            my_command::chat,
            my_command::detect_language,
            my_command::translate_specified_text,
            my_shortcut::register_hotkey_okey_ai,
            my_api::commands::initialize_api_manager,
            my_api::commands::switch_model,
            my_api::commands::get_current_model,
            my_api::commands::list_models,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .filter(my_logging::log_filter)
                        .build(),
                )?;
            }

            // 初始化 API 管理器
            my_api::setup_api_manager(&app.handle())?;
            my_modifier_keys::init_global_input_listener(&app.handle())?;
            my_shortcut::init_shortcuts(&app.handle())?;

            my_tray::create_tray(&app.handle())?;
            crate::my_test::test();
            crate::my_rdev::test();
            // ✅ 初始化翻译管理器
            setup_translation_manager(app)?;
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
// ✅ 翻译管理器初始化
fn setup_translation_manager(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let chat_history = app.state::<chat_histories::GlobalChatHistories>();
    let api_manager = app.state::<my_api::commands::GlobalAPIManager>();
    let translation_mgr =
        translation_manager::TranslationManager::new(chat_history.inner(), api_manager.0.clone());
    app.manage(translation_mgr);
    Ok(())
}
