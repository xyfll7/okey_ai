use rust_i18n::t;

#[tauri::command]
pub fn get_locale() -> String {
    rust_i18n::locale().to_string()
}

#[tauri::command]
pub fn set_locale(locale: String) {
    rust_i18n::set_locale(&locale);
}

#[tauri::command]
pub fn t_string(key: String) -> String {
    t!(key.as_str()).to_string()
}

pub fn init_i18n() {
    // Set default locale to English
    // In a more advanced implementation, you could load the user's preferred locale from settings
    rust_i18n::set_locale("en");
}
