use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{AppHandle, Runtime};
use tauri_plugin_store::StoreExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Shortcut {
    pub name: String,
    pub hot_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalConfig {
    pub shortcuts: Vec<Shortcut>,
    pub test_field: String,
}

impl Default for GlobalConfig {
    fn default() -> Self {
        #[cfg(target_os = "macos")]
        let cmd_ctrl_modifier = "Cmd";
        #[cfg(not(target_os = "macos"))]
        let cmd_ctrl_modifier = "Ctrl";

        GlobalConfig {
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
            test_field: "default_value".to_string(),
        }
    }
}

pub fn get_global_config<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<GlobalConfig, Box<dyn std::error::Error>> {
    let store = app.store("store.json")?;
    if let Some(value) = store.get("global_config") {
        let config: GlobalConfig = serde_json::from_value(value.clone())?;
        Ok(config)
    } else {
        let config = init_global_config(app)?;
        Ok(config)
    }
}

pub fn init_global_config<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<GlobalConfig, Box<dyn std::error::Error>> {
    let defaults = GlobalConfig::default();
    set_global_config(app, &defaults)?;
    Ok(defaults)
}

pub fn set_global_config<R: Runtime>(
    app: &AppHandle<R>,
    config: &GlobalConfig,
) -> Result<(), Box<dyn std::error::Error>> {
    let store = app.store("store.json")?;
    store.set("global_config", json!(config));
    store.save().map_err(|e| e.into())
}
