use crate::my_windows;
use rdev::{listen, EventType};
use std::thread;
use tauri::{AppHandle, Runtime};

pub fn test<R: Runtime>(app: &AppHandle<R>) {
    // Spawn listener in separate thread to avoid blocking main thread
    let app_handle = app.clone();
    thread::spawn(move || {
        let _ = listen(move |event| match event.event_type {
            EventType::KeyPress(key) => match key {
                rdev::Key::ControlLeft => {
                    println!("ControlLeft pressed");
                    my_windows::window_translate_bubble_show(
                        &app_handle,
                        Some(|| println!("Callback executed")),
                    );
                }
                _ => {
                    println!("Key pressed: {:?}", key);
                }
            },
            _ => {}
        });
    });
}
