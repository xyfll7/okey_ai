use std::{
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::{
    window::Color, AppHandle, Listener, Manager, Runtime, WebviewUrl, WebviewWindowBuilder,
};

use crate::{events::event_names, AppState};

pub fn create_or_show_about_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("about") {
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        let _ = WebviewWindowBuilder::new(app, "about", WebviewUrl::App("/about".into()))
            .title("About")
            .resizable(true)
            .build();
    }
}

pub fn create_or_show_main_window<R: Runtime, F>(app: &AppHandle<R>, callback: Option<F>)
where
    F: FnOnce() + Send + 'static,
{
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.set_always_on_top(true);
        if let Some(cb) = callback {
            cb();
        }
    } else {
        let mut builder =
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("/translate".into()))
                .title("Main Window")
                .resizable(true)
                .fullscreen(false)
                .skip_taskbar(true)
                .always_on_top(true)
                .background_color(Color(0, 0, 0, 0))
                .min_inner_size(350.0, 600.0)
                .inner_size(400.0, 600.0);

        #[cfg(target_os = "macos")]
        {
            builder = builder
                .title_bar_style(tauri::TitleBarStyle::Overlay)
                .hidden_title(true);
        }
        #[cfg(not(target_os = "macos"))]
        {
            builder = builder.decorations(false);
        }

        let _ = builder.build().and_then(|window| {
            window.show().ok();
            window.set_focus().ok();
            let callback_for_listener = Arc::new(Mutex::new(callback)).clone();
            window.listen(event_names::PAGE_LOADED, move |_event| {
                // Execute the callback function if provided, right after the print statement
                if let Ok(mut cb_option) = callback_for_listener.lock() {
                    if let Some(cb) = cb_option.take() {
                        drop(cb_option); // Release the lock before calling the callback
                        cb();
                    }
                }
            });

            // Get the app handle to access global state
            let state_handle = window.app_handle().clone();
            let cancelled = Arc::new(Mutex::new(false));
            let win_clone = window.clone();
            let cancel_flag = cancelled.clone();
            window.on_window_event(move |event| match event {
                tauri::WindowEvent::Focused(false) => {
                    *cancel_flag.lock().unwrap() = false;
                    let _win = win_clone.clone();
                    let local_cancel = cancel_flag.clone();
                    let state_handle = state_handle.clone();
                    thread::spawn(move || {
                        thread::sleep(Duration::from_millis(100));
                        if *local_cancel.lock().unwrap() {
                            return;
                        }
                        // Only destroy the window if auto-close is enabled
                        if {
                            let state = state_handle.state::<Mutex<AppState>>();
                            let state_guard = state.lock().unwrap();
                            !state_guard.auto_close_window
                        } {
                            _win.destroy().ok();
                        }
                    });
                }
                tauri::WindowEvent::Focused(true) => {
                    *cancelled.lock().unwrap() = true;
                }
                tauri::WindowEvent::Moved(_) => {
                    *cancelled.lock().unwrap() = true;
                }
                _ => {}
            });
            Ok(())
        });
    }
}
