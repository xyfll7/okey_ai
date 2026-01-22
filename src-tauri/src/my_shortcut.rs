use crate::states::app_config::Shortcut;
use crate::states::app_state::AppConfigState;
use crate::utils::text_translation;
use tauri::AppHandle;
use tauri::Manager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

#[tauri::command]
pub fn register_hotkey_okey_ai(app: AppHandle, shortcut: String) -> Result<(), String> {
    match app
        .global_shortcut()
        .on_shortcut(shortcut.as_str(), move |app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                crate::utils::text_translation::translate_selected_text(&app);
            }
        }) {
        Ok(_) => println!("成功注册动态快捷键: {}", shortcut),
        Err(e) => {
            let error_msg = format!("注册新快捷键失败: {}", e);
            println!("{}", error_msg);
            return Err(error_msg);
        }
    }

    // Use the update method to modify and save in one operation
    let old_shortcut = {
        let app_state = app.state::<AppConfigState>();
        let mut old_shortcut_result: Option<String> = None;
        app_state
            .update(|config| {
                // Find and store the old shortcut for "okey_ai" if it exists
                for shortcut_config in &mut config.shortcuts {
                    if shortcut_config.name == "okey_ai" {
                        old_shortcut_result = Some(shortcut_config.hot_key.clone());
                        shortcut_config.hot_key = shortcut.clone(); // Update the existing shortcut
                        break;
                    }
                }

                // If the "okey_ai" shortcut wasn't found in config, add it
                if old_shortcut_result.is_none() {
                    config.shortcuts.push(Shortcut {
                        name: "okey_ai".to_string(),
                        hot_key: shortcut.clone(),
                    });
                }
            })
            .map_err(|e| format!("Failed to save config: {}", e))?;
        old_shortcut_result
    };

    // If there was an old shortcut, unregister it specifically
    if let Some(old_key) = old_shortcut {
        if let Err(e) = app.global_shortcut().unregister(old_key.as_str()) {
            println!("注销旧快捷键失败 {}: {}", old_key, e);
        }
    }
    println!("已注销旧快捷键");

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
        match app
            .global_shortcut()
            .on_shortcut(hot_key.as_str(), move |app, shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    println!("快捷键触发: {} ({})", name, shortcut);
                    if name == "okey_ai" {
                        text_translation::translate_selected_text(&app);
                    }
                    if name == "test" {
                        println!("测试快捷键被按下");
                    }
                }
            }) {
            Ok(_) => println!(
                "成功注册快捷键: {} ({})",
                name_for_message, hot_key_for_message
            ),
            Err(e) => {
                eprintln!("注册快捷键失败 {}: {}", hot_key_for_message, e);
            }
        }
    }

    Ok(())
}
