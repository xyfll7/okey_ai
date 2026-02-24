use crate::my_tray;

#[tauri::command]
pub fn get_locale() -> String {
    rust_i18n::locale().to_string()
}

#[tauri::command]
pub fn set_locale(app_handle: tauri::AppHandle, locale: String) {
    rust_i18n::set_locale(&locale);
    let _ = my_tray::rebuild_tray_menu(&app_handle);
}

pub fn get_default_locale() -> String {
    let lang = tauri_plugin_os::locale()
        // "zh-CN" / "en-US" / "zh-TW" / "ja-JP" / "fr-FR"
        .and_then(|full_locale| full_locale.split('-').next().map(|s| s.to_string()))
        .unwrap_or_else(|| "en".to_string());
    lang
}
