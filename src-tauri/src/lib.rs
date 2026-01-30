rust_i18n::i18n!("locales");

mod my_api;
mod my_command;
mod my_events;
mod my_rdev;
mod my_shortcut;
mod my_tray;
mod my_types;
mod my_windows;
mod states;
mod utils;

use crate::my_types::TRKey;
use states::app_state::AppStateManager;
use states::chat_histories;
use tauri::Manager;
use tauri_plugin_notification::NotificationExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    rust_i18n::set_locale(&utils::i18n::get_default_locale());
    let api_manager = std::sync::Arc::new(tauri::async_runtime::RwLock::new(
        my_api::manager::APIManager::new(),
    ));
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            app.notification()
                .builder()
                .title(TRKey::NotificationTitle.t())
                .body(TRKey::NotificationBody.t())
                .show()
                .unwrap();
        }))
        .manage(my_api::manager::GlobalAPIManager(api_manager))
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        .invoke_handler(tauri::generate_handler![
            my_command::is_pin_translate_window_toggle,
            my_command::is_pin_translate_window_get,
            my_command::toggle_auto_speak,
            my_command::get_auto_speak_state,
            my_command::window_translate_show,
            my_command::close_main_window,
            my_command::chat_stream,
            my_command::detect_language,
            my_command::get_histories,
            my_command::get_current_history,
            my_command::update_model_api_key,
            my_shortcut::register_hotkey_okey_ai,
            my_api::commands::switch_model,
            my_api::commands::get_current_model,
            my_api::commands::list_available_models,
            utils::i18n::get_locale,
            utils::i18n::set_locale,
            utils::i18n::get_system_locale,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .filter(utils::log_filter::log_filter)
                        .build(),
                )?;
            }
            let state_manager = AppStateManager::new("app_config");
            let app_config_state = state_manager.init_app_config_state(app.handle())?;
            app.manage(app_config_state);
            my_api::setup_api_manager(&app.handle())?;
            my_tray::create_tray(&app.handle())?;
            my_rdev::init_global_input_listener(&app.handle())?;
            my_shortcut::init_shortcuts(&app.handle())?;
            setup_translation_manager(app)?;
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

fn setup_translation_manager(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    app.manage(chat_histories::ChatHistoriesState::new());
    let chat_history = app.state::<chat_histories::ChatHistoriesState>();
    let api_manager = app.state::<my_api::manager::GlobalAPIManager>();
    let app_config_state = app.state::<states::app_state::AppConfigState>();
    let translation_mgr = utils::translation_manager::TranslationManager::new(
        chat_history.inner(),
        api_manager.0.clone(),
        app_config_state.inner().clone(),
    );
    app.manage(translation_mgr);
    Ok(())
}
