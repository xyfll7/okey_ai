use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Shortcut {
    pub name: String,
    pub hot_key: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum AutoSpeakState {
    Off,
    #[default]
    Single,
    All,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub shortcuts: Vec<Shortcut>,
    pub auto_close_translate: bool,
    pub auto_speak: AutoSpeakState,
}

impl Default for AppConfig {
    fn default() -> Self {
        #[cfg(target_os = "macos")]
        let cmd_ctrl_modifier = "Cmd";
        #[cfg(not(target_os = "macos"))]
        let cmd_ctrl_modifier = "Ctrl";
        AppConfig {
            shortcuts: vec![
                Shortcut {
                    name: "okey_ai".to_string(),
                    hot_key: format!("{}+G", cmd_ctrl_modifier),
                },
                Shortcut {
                    name: "test".to_string(),
                    hot_key: format!("{}+H", cmd_ctrl_modifier),
                },
            ],
            auto_close_translate: false,
            auto_speak: AutoSpeakState::default(),
        }
    }
}
