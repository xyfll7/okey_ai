use crate::my_events::event_names;
use crate::my_windows;
use crate::utils::{self, translation_manager};
use selection;
use tauri::AppHandle;
use tauri::{async_runtime, Emitter, Manager};

use crate::utils::language_detection;

pub fn translate_selected_text(app_handle: &AppHandle) {
    let selected_text = selection::get_text();
    if selected_text.is_empty() {
        return;
    }
    println!("selected_text: {}", selected_text);
    let app_handle = app_handle.clone();
    async_runtime::spawn(async move {
        let detected_lang = language_detection::detect_language(&selected_text);

        let translation_prompt = match detected_lang {
            "zh-CN" => format!("请将以下中文文本翻译成英文：\n\n{}", selected_text),
            "en-US" => format!(
                "Please translate the following English text into Chinese: \n\n{}",
                selected_text
            ),
            _ => format!("请分析以下文本并给出总结：\n\n{}", selected_text),
        };
        let translation_manager = app_handle.state::<translation_manager::TranslationManager>();

        let _ = translation_manager.create_session().await;
        match translation_manager
            .translate(
                None,
                &translation_prompt,
                Some(selected_text),
                |chat_history| {
                    let _ = app_handle.emit(event_names::BUBBLE_AUTO_SPEAK, &chat_history);
                    let _ = app_handle.emit(event_names::AI_RESPONSE, &chat_history);
                },
            )
            .await
        {
            Some(chat_history) => {
                let app_handle_clone = app_handle.clone();
                my_windows::window_translate_show(
                    &app_handle,
                    Some(move || {
                        let _ = app_handle_clone.emit(event_names::AI_RESPONSE, &chat_history);
                    }),
                );
            }
            None => {
                let app_handle_clone = app_handle.clone();
                let error_msg = "翻译失败".to_string();
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

pub fn translate_selected_text_bubble(app_handle: &AppHandle) {
    let selected_text = selection::get_text();
    if selected_text.is_empty() {
        return;
    }
    println!("selected_text: {}", selected_text);
    let app_handle = app_handle.clone();
    async_runtime::spawn(async move {
        let detected_lang = language_detection::detect_language(&selected_text);

        let translation_prompt = match detected_lang {
            "zh-CN" => format!("请将以下中文文本翻译成英文：\n\n{}", selected_text),
            "en-US" => format!(
                "Please translate the following English text into Chinese: \n\n{}",
                selected_text
            ),
            _ => format!("请分析以下文本并给出总结：\n\n{}", selected_text),
        };
        let translation_manager = app_handle.state::<translation_manager::TranslationManager>();
        let _ = translation_manager.create_session().await;

        match translation_manager
            .translate(
                None,
                &translation_prompt,
                Some(selected_text),
                |chat_history| {
                    let _ = app_handle.emit(event_names::BUBBLE_AUTO_SPEAK, &chat_history);
                    let _ = app_handle.emit(event_names::AI_RESPONSE, &chat_history);
                },
            )
            .await
        {
            Some(chat_history) => {
                let _ = app_handle.emit(event_names::AI_RESPONSE, &chat_history);

                let window = app_handle.get_webview_window("translate_bubble");
                if let Some(window) = window {
                    let size = utils::calculate_text_width::calculate_text_width(
                        &chat_history.last().unwrap().content,
                    );
                    let _ = window.set_size(size);
                }
            }
            None => {
                let app_handle_clone = app_handle.clone();
                let error_msg = "翻译失败".to_string();
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
