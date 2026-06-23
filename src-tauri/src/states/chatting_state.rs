use crate::my_events::event_names;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

#[derive(Clone)]
pub struct ChattingState {
    inner: Arc<AtomicBool>,
    app_handle: AppHandle<tauri::Wry>,
}

impl ChattingState {
    pub fn new(app_handle: AppHandle<tauri::Wry>) -> Self {
        Self {
            inner: Arc::new(AtomicBool::new(false)),
            app_handle,
        }
    }

    pub fn set(&self, value: bool) {
        self.inner.store(value, Ordering::SeqCst);
        let _ = self
            .app_handle
            .emit(event_names::CHATTING_STATE_CHANGE, value);
    }

    pub fn get(&self) -> bool {
        self.inner.load(Ordering::SeqCst)
    }
}
