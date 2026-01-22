use crate::{my_api::manager::GlobalAPIManager, states::app_config::ModelType};
use tauri::State;

#[tauri::command(rename_all = "snake_case")]
pub async fn switch_model(
    model_name: String,
    state: State<'_, GlobalAPIManager>,
) -> Result<(), String> {
    let manager = state.0.read().await;
    let model_type = ModelType::from_str(&model_name);
    manager.set_current_model(model_type).await
}

#[tauri::command]
pub async fn get_current_model(state: State<'_, GlobalAPIManager>) -> Result<String, String> {
    let manager = state.0.read().await;
    Ok(manager.get_current_model().await)
}

#[tauri::command]
pub async fn get_models_list(state: State<'_, GlobalAPIManager>) -> Result<Vec<String>, String> {
    let manager = state.0.read().await;
    Ok(manager.list_available_models().await)
}
