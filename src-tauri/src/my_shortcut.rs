use crate::my_api::commands::GlobalAPIManager;
use crate::my_api::traits::{ChatCompletionRequest, ChatMessage};
use crate::my_config;
use crate::my_events::event_names;
use crate::my_types::InputData;
use crate::my_utils;
use crate::my_windows;
use rdev::{listen, Event};
use selection::get_text;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;
use tauri::{async_runtime, Emitter, Manager};
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
                translate_selected_text(&app);
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
                        translate_selected_text(&app);
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

pub fn set_shortcuts(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_handle = app.clone();
    let is_pressed = Arc::new(Mutex::new(false));

    thread::spawn(move || {
        if let Err(error) = listen(move |event: Event| match event.event_type {
            rdev::EventType::KeyPress(rdev::Key::ControlRight) => {
                let mut pressed = is_pressed.lock().unwrap();
                if !*pressed {
                    *pressed = true;
                    if let Err(e) = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                        println!("ControlRight KeyPress");
                        my_windows::window_input_method_editor_show(&app_handle);
                    })) {
                        eprintln!("Error creating window: {:?}", e);
                    }
                }
            }
            rdev::EventType::KeyRelease(rdev::Key::ControlRight) => {
                let mut pressed = is_pressed.lock().unwrap();
                if *pressed {
                    *pressed = false;
                    if let Err(e) = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                        println!("ControlRight KeyRelease");
                        my_windows::window_input_method_editor_hide(&app_handle);
                    })) {
                        eprintln!("Error hiding window: {:?}", e);
                    }
                }
            }
            _ => (),
        }) {
            println!("Error: {:?}", error);
        }
    });
    Ok(())
}

fn translate_selected_text(app_handle: &AppHandle) {
    let selected_text = get_text();
    if selected_text.is_empty() {
        return;
    }
    println!("selected_text: {}", selected_text);
    let input_data = InputData {
        input_time_stamp: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis()
            .to_string(),
        input_text: selected_text.clone(),
        response_text: None,
    };
    let input_data_clone = input_data.clone();

    let _ = app_handle.emit(event_names::AI_RESPONSE, &input_data);
    let app_handle = app_handle.clone();
    async_runtime::spawn(async move {
        let api_manager_state = app_handle.state::<GlobalAPIManager>();

        let detected_lang = my_utils::detect_language(&selected_text);

        let translation_prompt = match detected_lang {
            "zh-CN" => format!("请将以下中文文本翻译成英文：\n\n{}", selected_text),
            "en-US" => format!(
                "Please translate the following English text into Chinese: \n\n{}",
                selected_text
            ),
            _ => format!("请分析以下文本并给出总结：\n\n{}", selected_text),
        };

        let request = ChatCompletionRequest {
            model: "qwen-plus".to_string(),
            messages: vec![
                ChatMessage {
                    role: "system".to_string(),
                    content: "你是一个专业的翻译助手。请准确地进行语言翻译，保持原文的含义和语气。"
                        .to_string(),
                },
                ChatMessage {
                    role: "user".to_string(),
                    content: translation_prompt,
                },
            ],
            temperature: Some(0.1),
            max_tokens: Some(500),
            top_p: Some(1.0),
            stream: None,
        };

        match crate::my_api::commands::chat_completion(request, api_manager_state).await {
            Ok(response) => {
                if let Some(choice) = response.choices.first() {
                    let content = choice.message.content.clone();
                    let app_handle_clone = app_handle.clone();
                    my_windows::window_translate_show(
                        &app_handle,
                        Some(move || {
                            let _ = app_handle_clone.emit(event_names::AUTO_SPEAK, &input_data);
                            let mut input_data_with_response = input_data_clone;
                            input_data_with_response.response_text = Some(content);
                            let _ = app_handle_clone
                                .emit(event_names::AI_RESPONSE, &input_data_with_response);
                        }),
                    );
                }
            }
            Err(e) => {
                let app_handle_clone = app_handle.clone();
                let error_msg = e.to_string();
                my_windows::window_translate_show(
                    &app_handle,
                    Some(move || {
                        let _ = app_handle_clone.emit(event_names::AI_ERROR, error_msg);
                    }),
                );
            }
        }
    });
}
