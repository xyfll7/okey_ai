use serde::{Deserialize, Serialize};

#[derive(Default, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AutoSpeakState {
    Off,
    #[default]
    Single,
    All,
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

#[derive(Default, Serialize, Deserialize, Clone)]
pub struct AppState {
    pub auto_close_translate: bool,
    pub auto_speak: AutoSpeakState,
}
