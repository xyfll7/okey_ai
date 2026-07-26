use crate::my_events::event_names;
use crate::my_windows;
use crate::states::app_config::Language;
use crate::states::app_state::AppConfigState;
use crate::states::chatting_state::ChattingState;
use crate::utils::{language_detection, translation_manager};
use tauri::AppHandle;
use tauri::{async_runtime, Emitter, Manager};

fn build_translation_prompt(app_config_state: &AppConfigState, detected_lang: &str, selected_text: &str) -> String {
    let app_config_read = app_config_state.read();
    let detected_language = Language::from_locale(detected_lang);
    if app_config_read.self_explaining_model {
        "".to_string()
    } else {
        let effective_local_language: Language = app_config_read.local_language.effective_language();
        let effective_target_language = app_config_read.target_language.effective_language();

        let translate_into = app_config_read.prompt_tags.iter().find(|tag| tag.id == Some(2)).and_then(|tag| tag.content.clone()).unwrap_or_default();

        match detected_language {
            lang if lang == effective_local_language => translate_into.replace("{target}", &effective_target_language.to_display_name().to_string()).replace("{text}", selected_text),
            _ => translate_into.replace("{target}", &effective_local_language.to_display_name().to_string()).replace("{text}", selected_text),
        }
    }
}

pub fn translate_selected_text(app_handle: &AppHandle) {
    let app_handle = app_handle.clone();
    let chatting_state = app_handle.state::<ChattingState>();
    if chatting_state.get() {
        return;
    }
    async_runtime::spawn(async move {
        let selected_text = crate::utils::selecte_text::get_selected_text();
        if selected_text.is_empty() {
            my_windows::window_translate_show(&app_handle, None as Option<fn()>);
            return;
        }
        let detected_lang = language_detection::detect_language(&selected_text);

        let app_config_state = app_handle.state::<AppConfigState>();
        let translation_prompt = build_translation_prompt(&app_config_state, &detected_lang, &selected_text);

        let translation_manager = app_handle.state::<translation_manager::TranslationManager>();
        let should_use_existing_window = my_windows::should_use_existing_translate_window(app_handle.clone());

        if !should_use_existing_window {
            translation_manager.create_session().await;
        }

        let _ = app_handle.emit(event_names::BUBBLE_AUTO_SPEAK, &selected_text);

        if should_use_existing_window {
            let _ = app_handle.emit_to("translate", event_names::START_CHAT_STREAM, &translation_prompt);

            my_windows::window_translate_show(&app_handle, None as Option<fn()>);
            return;
        } else {
            let _ = app_handle.emit_to("translate_bubble", event_names::START_CHAT_STREAM, &translation_prompt);
            my_windows::window_translate_bubble_show(&app_handle, None as Option<fn()>);
            return;
        }
    });
}
