pub mod commands;
pub mod m_deepseek;
pub mod m_openai;
pub mod m_qwen;
pub mod m_zai;
pub mod manager;
pub mod traits;

use tauri::{AppHandle, Manager};

pub fn setup_api_manager(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    tauri::async_runtime::spawn({
        let app_handle = app.clone();
        async move {
            let api_manager_state = app_handle.state::<manager::GlobalAPIManager>();
            let app_config_state = app_handle.state::<crate::states::app_state::AppConfigState>();

            // Get API configurations from app state
            let config_map = {
                let config_guard = app_config_state.read();
                config_guard.api_configs.clone()
            };

            let _ = api_manager_state
                .0
                .write()
                .await
                .initialize_default_clients(config_map)
                .await;
            println!("API manager initialized successfully");
        }
    });
    Ok(())
}
