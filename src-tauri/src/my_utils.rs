use crate::my_api::commands::GlobalAPIManager;
use crate::my_api::traits::ChatCompletionRequest;
use crate::my_events::event_names;
use crate::my_types::InputData;
use crate::my_windows;
use crate::utils;
use crate::utils::chat_message::ChatMessage;
use crate::utils::chat_message::ChatMessageHistory;
use selection;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{async_runtime, Emitter, Manager};
use tauri::{AppHandle, Runtime};

pub fn create_input_data_and_emit<R: Runtime>(
    app_handle: &AppHandle<R>,
    selected_text: &str,
) -> InputData {
    let input_data = InputData {
        input_time_stamp: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis()
            .to_string(),
        input_text: selected_text.to_string(),
        response_text: None,
    };
    let _ = app_handle.emit(event_names::AUTO_SPEAK_BUBBLE, &input_data);
    input_data
}

pub fn detect_language(text: &str) -> &'static str {
    let chinese_chars = text
        .chars()
        .filter(|c| {
            (*c as u32) >= 0x4e00 && (*c as u32) <= 0x9fff // 基本汉字范围
        })
        .count();

    let total_chars = text.chars().filter(|c| !c.is_whitespace()).count();

    if total_chars == 0 {
        return "unknown";
    }

    let chinese_ratio = chinese_chars as f64 / total_chars as f64;
    if chinese_ratio > 0.3 {
        // 如果超过30%的字符是中文，则认为是中文
        "zh-CN"
    } else {
        "en-US"
    }
}

pub fn translate_selected_text(app_handle: &AppHandle) {
    let selected_text = selection::get_text();
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

        let detected_lang = detect_language(&selected_text);

        let translation_prompt = match detected_lang {
            "zh-CN" => format!("请将以下中文文本翻译成英文：\n\n{}", selected_text),
            "en-US" => format!(
                "Please translate the following English text into Chinese: \n\n{}",
                selected_text
            ),
            _ => format!("请分析以下文本并给出总结：\n\n{}", selected_text),
        };
        let mut history = ChatMessageHistory::new();
        history.add_system_message(
            "你是一个专业的翻译助手。请准确地进行语言翻译，保持原文的含义和语气。".to_string(),
        );
        history.add_user_message(translation_prompt.to_string());
        let request = ChatCompletionRequest {
            model: "qwen-plus".to_string(),
            messages: history.messages.clone(),
            temperature: Some(0.1),
            max_tokens: Some(500),
            top_p: Some(1.0),
            stream: None,
        };
        println!("request: {:?}", request);
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

pub fn translate_selected_text_for_translate_bubble(app_handle: &AppHandle) {
    let selected_text = selection::get_text();
    if selected_text.is_empty() {
        return;
    }
    let input_data = create_input_data_and_emit(&app_handle, &selected_text);
    let app_handle = app_handle.clone();
    async_runtime::spawn(async move {
        let api_manager_state = app_handle.state::<GlobalAPIManager>();

        let detected_lang = detect_language(&selected_text);

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
                    role: crate::utils::chat_message::Role::System,
                    content: "你是一个专业的翻译助手。请准确地进行语言翻译，保持原文的含义和语气。"
                        .to_string(),
                },
                ChatMessage {
                    role: crate::utils::chat_message::Role::User,
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
                    let _ = app_handle_clone.emit(event_names::AI_RESPONSE, &input_data);
                    let mut input_data_with_response = input_data.clone();
                    input_data_with_response.response_text = Some(content.clone()); // 克隆内容以供后续使用
                    let _ =
                        app_handle_clone.emit(event_names::AI_RESPONSE, &input_data_with_response);
                    let window = app_handle_clone.get_webview_window("translate_bubble");
                    if let Some(window) = window {
                        let size = utils::calculate_text_width::calculate_text_width(&content);
                        let _ = window.set_size(size);
                    }
                }
            }
            Err(e) => {
                let app_handle_clone = app_handle.clone();
                let error_msg = e.to_string();
                let _ = app_handle_clone.emit(event_names::AI_ERROR, error_msg);
            }
        }
    });
}
