use crate::{states::app_config::ModelProvider, states::app_state::AppConfigState};
use serde_json;
use std::collections::HashMap;
use tauri::State;

#[tauri::command(rename_all = "snake_case")]
pub async fn switch_model(
    model_name: String,
    app_config_state: State<'_, AppConfigState>,
) -> Result<(), String> {
    // 使用 serde 进行反序列化
    let model_type: ModelProvider = serde_json::from_str(&format!("\"{}\"", model_name))
        .map_err(|e| format!("Failed to parse model: {}", e))?;

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
    // 使用 serde 序列化然后去掉引号
    let model_str =
        serde_json::to_string(&config_guard.current_model).map_err(|e| e.to_string())?;
    let model_name = model_str.trim_matches('"').to_string();
    Ok(model_name)
}

#[tauri::command]
pub async fn list_available_models(
    app_config_state: State<'_, AppConfigState>,
) -> Result<HashMap<ModelProvider, crate::my_api::traits::APIConfig>, String> {
    // Get API configurations from app state
    let config_map = {
        let config_guard = app_config_state.read();
        config_guard.api_configs.clone()
    };
    Ok(config_map)
}
