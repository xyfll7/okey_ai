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
    /// Create a new AppStateManager
    pub fn new(store_key: impl Into<String>) -> Self {
        Self {
            store_key: store_key.into(),
        }
    }

    /// Print store.json location
    pub fn print_store_path<R: Runtime>(&self, app: &AppHandle<R>) {
        let app_data_dir = app
            .path()
            .app_data_dir()
            .expect("Failed to get app data directory");
        let store_path = app_data_dir.join("store.json");
        println!("📁 store.json path: {:?}", store_path);
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
pub struct AutoSaveAppState<R: Runtime> {
    inner: Arc<RwLock<AppConfig>>,
    store_key: String,
    app_handle: AppHandle<R>,
}

impl<R: Runtime> AutoSaveAppState<R> {
    pub fn new(inner: Arc<RwLock<AppConfig>>, store_key: String, app_handle: AppHandle<R>) -> Self {
        Self {
            inner,
            store_key,
            app_handle,
        }
    }

    pub fn read(&self) -> std::sync::RwLockReadGuard<'_, AppConfig> {
        self.inner.read().unwrap()
    }

    pub fn write(&self) -> AutoSaveWriteGuard<'_, R> {
        let guard = self.inner.write().unwrap();
        AutoSaveWriteGuard {
            guard,
            store_key: self.store_key.clone(),
            app_handle: self.app_handle.clone(),
            needs_save: false, // Only save if actually modified
        }
    }
}

/// Write guard that automatically saves on drop
pub struct AutoSaveWriteGuard<'a, R: Runtime> {
    guard: std::sync::RwLockWriteGuard<'a, AppConfig>,
    store_key: String,
    app_handle: AppHandle<R>,
    needs_save: bool,
}

impl<'a, R: Runtime> std::ops::Deref for AutoSaveWriteGuard<'a, R> {
    type Target = AppConfig;

    fn deref(&self) -> &Self::Target {
        &self.guard
    }
}

impl<'a, R: Runtime> std::ops::DerefMut for AutoSaveWriteGuard<'a, R> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        self.needs_save = true;
        &mut self.guard
    }
}

impl<'a, R: Runtime> Drop for AutoSaveWriteGuard<'a, R> {
    fn drop(&mut self) {
        if self.needs_save {
            let store_key = self.store_key.clone();
            let config = self.guard.clone();
            let app_handle = self.app_handle.clone();

            // Spawn async task to save config
            tauri::async_runtime::spawn(async move {
                let manager = AppStateManager::new(store_key);
                if let Err(e) = manager.save(&app_handle, &config) {
                    eprintln!("Failed to auto-save config: {}", e);
                }
            });
        }
    }
}

impl AppStateManager {
    /// Create a new AutoSaveAppState instance with auto-save functionality
    pub fn init_auto_save_state<R: Runtime>(
        &self,
        app: &AppHandle<R>,
    ) -> Result<AutoSaveAppState<R>, Box<dyn std::error::Error>> {
        let config = self.load(app)?;
        let state = Arc::new(RwLock::new(config));
        Ok(AutoSaveAppState::new(
            state,
            self.store_key.clone(),
            app.clone(),
        ))
    }
}
