use crate::my_api::manager::APIManager;
use crate::my_api::traits::{APIConfig, ChatCompletionRequest};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{async_runtime::RwLock, State};

pub struct GlobalAPIManager(pub Arc<RwLock<APIManager>>);

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

pub async fn chat_completion(
    request: ChatCompletionRequest<'_>,
    state: State<'_, GlobalAPIManager>,
) -> Result<crate::my_api::traits::ChatCompletionResponse, String> {
    let manager = state.0.read().await;
    manager.chat_completion(&request).await
}
