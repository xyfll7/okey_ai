use crate::my_config;
use crate::utils::text_translation;
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

#[tauri::command]
pub fn register_hotkey_okey_ai(app: AppHandle, shortcut: String) -> Result<(), String> {
    // First, try to register the new shortcut
    let shortcut_for_closure = shortcut.clone();
    match app
        .global_shortcut()
        .on_shortcut(shortcut.as_str(), move |app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                println!("动态快捷键触发: {}", shortcut_for_closure);
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

    // Get the current configuration
    let mut global_config: my_config::GlobalConfig =
        my_config::get_global_config(&app).map_err(|e| format!("获取配置失败: {}", e))?;

    // Find and store the old shortcut for "okey_ai" if it exists
    let mut old_shortcut: Option<String> = None;
    for shortcut_config in &mut global_config.shortcuts {
        if shortcut_config.name == "okey_ai" {
            old_shortcut = Some(shortcut_config.hot_key.clone());
            shortcut_config.hot_key = shortcut.clone(); // Update the existing shortcut
            break;
        }
    }

    // If the "okey_ai" shortcut wasn't found in config, add it
    if old_shortcut.is_none() {
        global_config.shortcuts.push(crate::my_config::Shortcut {
            name: "okey_ai".to_string(),
            hot_key: shortcut.clone(),
        });
    }

    // Save the updated configuration only if shortcut registration was successful
    my_config::set_global_config(&app, &global_config)
        .map_err(|e| format!("保存配置失败: {}", e))?;

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
    let global_config: crate::my_config::GlobalConfig = my_config::get_global_config(app)?;

    for shortcut in global_config.shortcuts {
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

// This function has been moved to my_utils.rs as it's needed by multiple components
// See my_utils::translate_selected_text for implementation
