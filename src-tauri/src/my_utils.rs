use crate::my_api::commands::GlobalAPIManager;
use crate::my_api::traits::{ChatCompletionRequest, ChatMessage};
use crate::my_events::event_names;
use crate::my_types::InputData;
use crate::my_windows;
use selection;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::LogicalSize;
use tauri::{async_runtime, Emitter, Manager};
use tauri::{AppHandle, Runtime};

pub fn calculate_window_size(content: &str) -> LogicalSize<f64> {
    // 计算文本实际占用的宽度
    let mut total_width: f64 = 0.0;
    
    for c in content.chars() {
        total_width += match c {
            // 中文字符（CJK统一表意文字）
            '\u{4E00}'..='\u{9FFF}' |  // 基本汉字
            '\u{3400}'..='\u{4DBF}' |  // 扩展A
            '\u{20000}'..='\u{2A6DF}' | // 扩展B
            '\u{2A700}'..='\u{2B73F}' | // 扩展C
            '\u{2B740}'..='\u{2B81F}' | // 扩展D
            '\u{2B820}'..='\u{2CEAF}' | // 扩展E
            '\u{F900}'..='\u{FAFF}' |   // 兼容汉字
            '\u{2F800}'..='\u{2FA1F}'   // 兼容补充
            => 16.0, // 中文字符占用约16像素
            
            // 全角字符（包括全角标点、日文假名等）
            '\u{FF01}'..='\u{FF5E}' |  // 全角ASCII
            '\u{3000}'..='\u{303F}' |  // CJK标点
            '\u{3040}'..='\u{309F}' |  // 平假名
            '\u{30A0}'..='\u{30FF}'    // 片假名
            => 16.0,
            
            // 韩文字符
            '\u{AC00}'..='\u{D7AF}' |  // 韩文音节
            '\u{1100}'..='\u{11FF}'    // 韩文字母
            => 16.0,
            
            // 表情符号和特殊符号
            '\u{1F300}'..='\u{1F9FF}' | // 表情符号
            '\u{2600}'..='\u{26FF}' |   // 杂项符号
            '\u{2700}'..='\u{27BF}'     // 装饰符号
            => 16.0,
            
            // 制表符
            '\t' => 32.0,
            
            // 换行符（视为普通空格）
            '\n' | '\r' => 8.0,
            
            // ASCII字符
            _ if c.is_ascii() => {
                match c {
                    'W' | 'M' | 'w' | 'm' => 10.0, // 宽字母
                    'i' | 'l' | 'I' | '.' | ',' | ':' | ';' | '\'' | '!' | '|' => 4.0, // 窄字符
                    _ => 8.0, // 普通字符
                }
            },
            
            // 其他Unicode字符，默认半角宽度
            _ => 8.0,
        };
    }
    
    // 添加左右边距
    let padding: f64 = 100.0;
    let calculated_width = total_width + padding;
    
    // 限制宽度范围：最小150，最大800
    let width = calculated_width.clamp(150.0, 800.0);
    let height: f64 = 33.0; // 保持高度不变
    
    LogicalSize::new(width, height)
}

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
                    let _ = app_handle_clone.emit(event_names::AI_RESPONSE, &input_data);
                    let mut input_data_with_response = input_data.clone();
                    input_data_with_response.response_text = Some(content.clone()); // 克隆内容以供后续使用
                    let _ =
                        app_handle_clone.emit(event_names::AI_RESPONSE, &input_data_with_response);
                    let window = app_handle_clone.get_webview_window("translate_bubble");
                    if let Some(window) = window {
                        let size = calculate_window_size(&content);
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
