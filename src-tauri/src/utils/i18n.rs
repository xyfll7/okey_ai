#[tauri::command]
pub fn get_locale() -> String {
    rust_i18n::locale().to_string()
}

#[tauri::command]
pub fn set_locale(locale: String) {
    rust_i18n::set_locale(&locale);
}

#[tauri::command]
pub fn get_system_locale() -> String {
    // 使用 tauri-plugin-os 获取系统区域设置
    get_default_locale()
}

// 根据操作系统获取默认语言的函数
pub fn get_default_locale() -> String {
    let lang = tauri_plugin_os::locale() // 获取系统 locale，例如可能得到：
        // "zh-CN" / "en-US" / "zh-TW" / "ja-JP" / "fr-FR"
        .and_then(|full_locale| {
            // 如果成功拿到值（Option<String> -> Some）
            full_locale // 例如 "zh-CN"
                .split('-') // 分割成 ["zh", "CN"]
                .next() // 取第一个部分 → Some("zh")
                .map(|s| s.to_string()) // 把 &str 转成 String
        }) // 结果可能是 Some("zh") 或 None（如果原来是空字符串或格式非常奇怪）
        .unwrap_or_else(|| "en".to_string()); // 有值就用，没值（包括获取失败、格式异常等）就给 "en"
    lang
}
