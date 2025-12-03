use selection::get_text;

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
