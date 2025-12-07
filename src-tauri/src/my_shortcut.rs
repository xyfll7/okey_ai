use crate::my_api::commands::GlobalAPIManager;
use crate::my_api::traits::{ChatCompletionRequest, ChatMessage};
use crate::my_events::event_names;
use crate::my_types::InputData;
use crate::my_utils;
use crate::my_windows::create_or_show_main_window;
use crate::AppState;
use selection::get_text;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{async_runtime, AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
pub fn setup_shortcuts(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let shortcut_0 = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyY);
    let shortcut_1 = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyI);

    let app_handle = app.clone();
    let shortcut_0_clone = shortcut_0.clone();
    let shortcut_1_clone = shortcut_1.clone();

    app.plugin(
        tauri_plugin_global_shortcut::Builder::new()
            .with_handler(
                move |_app: &AppHandle, shortcut, event| match event.state() {
                    ShortcutState::Pressed => match shortcut {
                        s if s == &shortcut_0_clone => {
                            translate_selected_text(&app_handle);
                        }
                        s if s == &shortcut_1_clone => {
                            handle_ctrl_1(&app_handle);
                        }
                        _ => {}
                    },
                    _ => {}
                },
            )
            .build(),
    )?;

    match app.global_shortcut().register(shortcut_0) {
        Ok(()) => println!("快捷键 Ctrl+Y 注册成功"),
        Err(e) => eprintln!("快捷键 Ctrl+Y 注册失败: {:?}", e),
    }
    match app.global_shortcut().register(shortcut_1) {
        Ok(()) => println!("快捷键 Ctrl+I 注册成功"),
        Err(e) => eprintln!("快捷键 Ctrl+I 注册失败: {:?}", e),
    }
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

    if {
        let state = app_handle.state::<Mutex<AppState>>();
        let state_guard = state.lock().unwrap();
        state_guard.auto_speak
    } {
        let _ = app_handle.emit(event_names::AUTO_SPEAK, &input_data);
    }

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
                    create_or_show_main_window(
                        &app_handle,
                        Some(move || {
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
                create_or_show_main_window(
                    &app_handle,
                    Some(move || {
                        let _ = app_handle_clone.emit(event_names::AI_ERROR, error_msg);
                    }),
                );
            }
        }
    });
}

fn handle_ctrl_1(app_handle: &AppHandle) {
    let _ = app_handle.emit(event_names::GLOBAL_SHORTCUT_PRESSED, "open_settings");
}
