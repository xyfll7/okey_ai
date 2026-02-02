use crate::my_events::event_names;
use crate::utils::{self, translation_manager};
use crate::{my_command, my_windows};
use tauri::AppHandle;
use tauri::{async_runtime, Emitter, Manager};

use crate::utils::language_detection;

#[derive(Debug, Clone, PartialEq)]
pub enum DisplayType {
    Normal,
    Bubble,
}

pub fn translate_selected_text(app_handle: &AppHandle, display_type: DisplayType) {
    let app_handle = app_handle.clone();
    async_runtime::spawn(async move {
        let selected_text = crate::utils::selecte_text::get_selected_text();
        if selected_text.is_empty() {
            return;
        }
        println!("selected_text: {}", selected_text);
        let detected_lang = language_detection::detect_language(&selected_text);

        let translation_prompt = match detected_lang {
            "zh-CN" => format!(
                "Please translate the following text into English:\n\n{}",
                selected_text
            ),
            "en-US" => format!(
                "Please translate the following text into Chinese: \n\n{}",
                selected_text
            ),
            _ => format!(
                "Please analyze the following text and provide a summary：\n\n{}",
                selected_text
            ),
        };
        let translation_manager = app_handle.state::<translation_manager::TranslationManager>();

        translation_manager.create_session().await;

        let messages = translation_manager
            .add_user_message(None, &translation_prompt, Some(selected_text.clone()))
            .await
            .unwrap_or_default();

        let _ = app_handle.emit(event_names::BUBBLE_AUTO_SPEAK, &messages);
        let _ = app_handle.emit(event_names::AI_RESPONSE, &messages);
        if my_command::is_pin_translate_window_get(app_handle.clone())
            && app_handle.get_webview_window("translate").is_some()
        {
            let _ = app_handle.emit(event_names::CHAT_STREAM, &selected_text);
            return;
        } else if display_type == DisplayType::Bubble {
            my_windows::window_translate_bubble_show(&app_handle, None as Option<fn()>);
        }

        match translation_manager.translate(None, messages).await {
            Some(chat_history) => match display_type {
                DisplayType::Normal => {
                    let app_handle_for_normal = app_handle.clone();
                    let chat_history_clone = chat_history.clone();
                    my_windows::window_translate_show(
                        &app_handle,
                        Some(move || {
                            let app_handle_for_thread = app_handle_for_normal.clone();
                            std::thread::spawn(move || {
                                std::thread::sleep(std::time::Duration::from_millis(100));
                                let _ = app_handle_for_thread
                                    .emit(event_names::AI_RESPONSE, &chat_history_clone);
                            });
                        }),
                    );
                }
                DisplayType::Bubble => {
                    let _ = app_handle.emit(event_names::AI_RESPONSE, &chat_history);

                    let window = app_handle.get_webview_window("translate_bubble");
                    if let Some(window) = window {
                        let size = utils::calculate_text_width::calculate_text_width(
                            &chat_history.last().unwrap().content,
                        );
                        let _ = window.set_size(size);
                    }
                }
            },
            None => {
                println!("Translation failed!");
            }
        }
    });
}
