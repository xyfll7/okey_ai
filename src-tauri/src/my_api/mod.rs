pub mod commands;
pub mod manager;
pub mod provider;
pub mod traits;

use tauri::{AppHandle, Manager};

/// Rebuild in-memory LLM clients from current `AppConfigState` (e.g. after API key updates).
pub async fn refresh_api_clients_from_app_config(app: &AppHandle) {
    let api_manager_state = app.state::<manager::GlobalAPIManager>();
    let app_config_state = app.state::<crate::states::app_state::AppConfigState>();
    let config_map = {
        let config_guard = app_config_state.read();
        config_guard.api_configs.clone()
    };
    api_manager_state.inner().write().await.initialize_default_clients(config_map).await;
}

pub fn setup_api_manager(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    tauri::async_runtime::spawn({
        let app_handle = app.clone();
        async move {
            refresh_api_clients_from_app_config(&app_handle).await;
            log::info!("API manager initialized successfully");
        }
    });
    Ok(())
}
