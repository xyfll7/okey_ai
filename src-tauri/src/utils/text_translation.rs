use crate::my_command;
use crate::my_events::event_names;
use crate::my_windows;
use crate::states::app_config::PromptTag;
use crate::states::chatting_state::ChattingState;
use crate::utils::translation_manager;
use serde::Serialize;
use tauri::AppHandle;
use tauri::{async_runtime, Emitter, Manager};

#[derive(Clone, Serialize)]
struct TranslationPayload {
    translation_prompt: String,
    selected_text: String,
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

        let translation_prompt = my_command::assemble_prompt(app_handle.clone(), PromptTag { raw: Some(selected_text.clone()), ..Default::default() }).unwrap_or_default();

        #[rustfmt::skip]
        let payload = TranslationPayload { 
            translation_prompt: translation_prompt.clone(), 
            selected_text: selected_text.clone() 
        };
        if my_windows::should_use_existing_translate_window(app_handle.clone()) {
            let _ = app_handle.emit_to("translate", event_names::START_CHAT_STREAM, &payload);
            my_windows::window_translate_show(&app_handle, None as Option<fn()>);
            return;
        } else {
            let translation_manager = app_handle.state::<translation_manager::TranslationManager>();
            translation_manager.create_session().await;

            let _ = app_handle.emit_to("translate_bubble", event_names::START_CHAT_STREAM, &payload);
            my_windows::window_translate_bubble_show(&app_handle, None as Option<fn()>);
            return;
        }
    });
}
