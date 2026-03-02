use crate::my_tray;
use crate::states::app_config::Language;
use crate::states::app_state::AppConfigState;

#[tauri::command]
pub fn get_locale() -> String {
    rust_i18n::locale().to_string()
}

#[tauri::command]
pub fn set_locale(
    app_handle: tauri::AppHandle,
    locale: String,
    app_config_state: tauri::State<AppConfigState>,
) {
    rust_i18n::set_locale(&locale);

    // Map locale string to Language enum
    let language = Language::from_locale(&locale);

    // Persist to app config
    let _ = app_config_state.update(|config| {
        config.language = language;
    });

    let _ = my_tray::rebuild_tray_menu(&app_handle);
}

pub fn get_default_locale() -> String {
    let lang = tauri_plugin_os::locale()
        // "en" / "zh-CN"  / "zh-TW" / "ja-JP" / "fr-FR"
        .and_then(|full_locale| full_locale.split('-').next().map(|s| s.to_string()))
        .unwrap_or_else(|| "en".to_string());
    lang
}
