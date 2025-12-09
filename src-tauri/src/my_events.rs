/// Constants for all Tauri event names used in the application
/// This centralizes event name management to avoid typos and make refactoring easier

pub mod event_names {
    /// Event emitted when AI processing completes and response is ready
    pub const AUTO_SPEAK: &str = "AUTO_SPEAK";
    pub const AI_RESPONSE: &str = "AI_RESPONSE";

    /// Event emitted when an AI processing error occurs
    pub const AI_ERROR: &str = "AI_ERROR";

    /// Event emitted when a page has finished loading
    pub const PAGE_LOADED: &str = "PAGE_LOADED";

    // Event emitted when a global shortcut is pressed
    // pub const GLOBAL_SHORTCUT_PRESSED: &str = "GLOBAL_SHORTCUT_PRESSED";
}
