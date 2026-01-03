use selection;

pub fn get_selected_text() -> String {
    let selected_text = selection::get_text();
    if selected_text.is_empty() {
        return String::new();
    }
    selected_text
}
