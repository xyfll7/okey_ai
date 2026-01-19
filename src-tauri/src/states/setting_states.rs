use serde::Serialize;

#[derive(Default, Clone, Copy, PartialEq)]
pub enum AutoSpeakState {
    Off, // Completely off
    #[default]
    Single, // Read single word
    All, // Read full sentence
}

impl std::fmt::Display for AutoSpeakState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AutoSpeakState::Off => write!(f, "off"),
            AutoSpeakState::Single => write!(f, "single"),
            AutoSpeakState::All => write!(f, "all"),
        }
    }
}

impl Serialize for AutoSpeakState {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Default)]
pub struct AppState {
    pub auto_close_translate: bool,
    #[allow(dead_code)]
    pub auto_close_bubble: bool,
    pub auto_speak: AutoSpeakState,
}
