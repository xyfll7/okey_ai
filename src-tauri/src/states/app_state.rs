use crate::states::app_config::AppConfig;
use serde_json::json;
use std::sync::Arc;
use std::sync::RwLock;
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_store::StoreExt;

/// Global application state manager that handles config persistence
pub struct AppStateManager {
    store_key: String,
}

impl AppStateManager {
    pub fn new(store_key: impl Into<String>) -> Self {
        Self {
            store_key: store_key.into(),
        }
    }

    pub fn init_app_config_state<R: Runtime>(
        &self,
        app: &AppHandle<R>,
    ) -> Result<AppConfigState<R>, Box<dyn std::error::Error>> {
        let config = self.load(app)?;
        let state = Arc::new(RwLock::new(config));
        let new_manager = AppStateManager::new(self.store_key.clone());
        Ok(AppConfigState::new(state, new_manager, app.clone()))
    }

    fn print_store_path<R: Runtime>(&self, app: &AppHandle<R>) {
        let app_data_dir = app
            .path()
            .app_data_dir()
            .expect("Failed to get app data directory");
        let store_path = app_data_dir.join("store.json");
        println!("📁 store.json path: {:?}", store_path);
    }

    /// Load configuration from store, or initialize with defaults
    fn load<R: Runtime>(
        &self,
        app: &AppHandle<R>,
    ) -> Result<AppConfig, Box<dyn std::error::Error>> {
        let store = app.store("store.json")?;
        self.print_store_path(app);
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
    fn save<R: Runtime>(
        &self,
        app: &AppHandle<R>,
        config: &AppConfig,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let store = app.store("store.json")?;
        store.set(&self.store_key, json!(config));
        store.save().map_err(|e| e.into())
    }
}

pub struct AppConfigState<R: Runtime> {
    inner: Arc<RwLock<AppConfig>>,
    manager: AppStateManager,
    app_handle: AppHandle<R>,
}

impl<R: Runtime> AppConfigState<R> {
    fn new(
        inner: Arc<RwLock<AppConfig>>,
        manager: AppStateManager,
        app_handle: AppHandle<R>,
    ) -> Self {
        Self {
            inner,
            manager,
            app_handle,
        }
    }

    fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let config = self.inner.read().unwrap().clone();
        self.manager.save(&self.app_handle, &config)
    }

    pub fn read(&self) -> std::sync::RwLockReadGuard<'_, AppConfig> {
        self.inner.read().unwrap()
    }

    // 可选：提供批量修改 + 一次保存的 helper
    pub fn update<F>(&self, f: F) -> Result<(), Box<dyn std::error::Error>>
    where
        F: FnOnce(&mut AppConfig),
    {
        {
            let mut guard = self.inner.write().unwrap();
            f(&mut guard);
        }
        self.save()
    }
}
