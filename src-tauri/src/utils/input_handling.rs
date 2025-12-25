use crate::my_events::event_names;
use crate::my_types::InputData;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Emitter, Runtime};

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