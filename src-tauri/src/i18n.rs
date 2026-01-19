#[tauri::command]
pub fn get_locale() -> String {
    rust_i18n::locale().to_string()
}

#[tauri::command]
pub fn set_locale(locale: String) {
    rust_i18n::set_locale(&locale);
}

pub fn init_i18n() {
    rust_i18n::set_locale("en");
}
