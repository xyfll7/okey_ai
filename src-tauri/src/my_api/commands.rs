use crate::{
    my_api::manager::GlobalAPIManager, states::app_config::ModelProvider,
    states::app_state::AppConfigState,
};
use tauri::State;

#[tauri::command(rename_all = "snake_case")]
pub async fn switch_model(
    model_name: String,
    app_config_state: State<'_, AppConfigState>,
) -> Result<(), String> {
    let model_type = ModelProvider::from_str(&model_name);
    app_config_state
        .update(|config| {
            config.current_model = model_type;
        })
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_current_model(
    app_config_state: State<'_, AppConfigState>,
) -> Result<String, String> {
    let config_guard = app_config_state.read();
    Ok(config_guard.current_model.as_str().to_string())
}

#[tauri::command]
pub async fn list_available_models(
    state: State<'_, GlobalAPIManager>,
) -> Result<Vec<String>, String> {
    let manager = state.0.read().await;
    Ok(manager.list_available_models().await)
}
