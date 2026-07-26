use crate::states::app_config::Shortcut;
use crate::states::app_state::AppConfigState;
use crate::utils::text_translation;
use tauri::AppHandle;
use tauri::Manager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

#[tauri::command]
pub fn register_hotkey_okey_ai(app: AppHandle, new_hotkey: String) -> Result<(), String> {
    match app.global_shortcut().on_shortcut(new_hotkey.as_str(), move |app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            text_translation::translate_selected_text(&app);
        }
    }) {
        Ok(_) => log::info!("Successfully registered new_hotkey: {}", new_hotkey),
        Err(e) => {
            log::error!("Failed to register new new_hotkey: {}", e);
        }
    }

    let old_shortcut = {
        let app_state = app.state::<AppConfigState>();
        let mut old_shortcut_result: Option<String> = None;
        app_state
            .update(|config| {
                for shortcut_config in &mut config.shortcuts {
                    if shortcut_config.name == "okey_ai" {
                        old_shortcut_result = Some(shortcut_config.hot_key.clone());
                        shortcut_config.hot_key = new_hotkey.clone(); // Update the existing shortcut
                        break;
                    }
                }

                if old_shortcut_result.is_none() {
                    config.shortcuts.push(Shortcut { name: "okey_ai".to_string(), hot_key: new_hotkey.clone() });
                }
            })
            .map_err(|e| format!("Failed to save config: {}", e))?;
        old_shortcut_result
    };

    if let Some(old_key) = old_shortcut {
        if let Err(e) = app.global_shortcut().unregister(old_key.as_str()) {
            log::error!("Failed to deregister the old shortcut key {}: {}", old_key, e);
        }
    }
    log::info!("Old shortcut key has been deactivated");

    Ok(())
}

pub fn init_shortcuts(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_state = app.state::<AppConfigState>();
    let config = app_state.read().clone();

    for shortcut in config.shortcuts {
        let hot_key = shortcut.hot_key.clone();
        let name = shortcut.name.clone();

        let hot_key_for_message = hot_key.clone();
        let name_for_message = name.clone();
        match app.global_shortcut().on_shortcut(hot_key.as_str(), move |app, _, event| {
            if event.state == ShortcutState::Pressed {
                if name == "okey_ai" {
                    text_translation::translate_selected_text(&app);
                }
            }
        }) {
            Ok(_) => log::info!("Successfully registered shortcut key: {} ({})", name_for_message, hot_key_for_message),
            Err(e) => {
                log::error!("Failed to register shortcut key {}: {}", hot_key_for_message, e);
            }
        }
    }

    Ok(())
}
