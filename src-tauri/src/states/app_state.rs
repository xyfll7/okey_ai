use crate::states::app_config::AppConfig;
use serde_json::json;
use std::sync::Arc;
use tauri::{AppHandle, Runtime};
use tauri_plugin_store::StoreExt;

/// Global application state manager that handles config persistence
pub struct AppStateManager {
    store_key: String,
}

impl AppStateManager {
    /// Create a new AppStateManager
    pub fn new(store_key: impl Into<String>) -> Self {
        Self {
            store_key: store_key.into(),
        }
    }

    /// Load configuration from store, or initialize with defaults
    pub fn load<R: Runtime>(
        &self,
        app: &AppHandle<R>,
    ) -> Result<AppConfig, Box<dyn std::error::Error>> {
        let store = app.store("store.json")?;
        if let Some(value) = store.get(&self.store_key) {
            let config: AppConfig = serde_json::from_value(value.clone())?;
            Ok(config)
        } else {
            let config = AppConfig::default();
            self.save(app, &config)?;
            Ok(config)
        }
    }

    /// Save configuration to store
    pub fn save<R: Runtime>(
        &self,
        app: &AppHandle<R>,
        config: &AppConfig,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let store = app.store("store.json")?;
        store.set(&self.store_key, json!(config));
        store.save().map_err(|e| e.into())
    }
}

/// Thread-safe wrapper for AppConfig with automatic persistence
pub type AppState = Arc<tauri::async_runtime::RwLock<AppConfig>>;

impl AppStateManager {
    /// Create a new AppState instance and load configuration
    pub fn init_state<R: Runtime>(
        &self,
        app: &AppHandle<R>,
    ) -> Result<AppState, Box<dyn std::error::Error>> {
        let config = self.load(app)?;
        Ok(Arc::new(tauri::async_runtime::RwLock::new(config)))
    }
}
