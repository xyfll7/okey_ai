use crate::my_api::manager::GlobalAPIManager;
use crate::my_api::traits::APIConfig;
use std::collections::HashMap;
use tauri::State;

#[tauri::command]
pub async fn initialize_api_manager(
    configs: Vec<(String, APIConfig)>,
    state: State<'_, GlobalAPIManager>,
) -> Result<(), String> {
    let manager = state.0.write().await;

    let mut config_map = HashMap::new();
    for (name, config) in configs {
        config_map.insert(name, config);
    }

    manager.initialize_default_clients(config_map).await;
    Ok(())
}

#[tauri::command]
pub async fn switch_model(
    model_name: String,
    state: State<'_, GlobalAPIManager>,
) -> Result<(), String> {
    let manager = state.0.read().await;
    manager.set_current_model(model_name).await
}

#[tauri::command]
pub async fn get_current_model(state: State<'_, GlobalAPIManager>) -> Result<String, String> {
    let manager = state.0.read().await;
    Ok(manager.get_current_model().await)
}

#[tauri::command]
pub async fn list_models(state: State<'_, GlobalAPIManager>) -> Result<Vec<String>, String> {
    let manager = state.0.read().await;
    Ok(manager.list_available_models().await)
}
