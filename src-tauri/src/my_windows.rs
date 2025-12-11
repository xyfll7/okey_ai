use std::{
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::{
    window::Color, AppHandle, Listener, Manager, Runtime, WebviewUrl, WebviewWindowBuilder,
};

use crate::{my_events::event_names, AppState};
use mouse_position::mouse_position::{Mouse, Position};
use tauri::Monitor;

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

pub fn create_or_show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        let _ = WebviewWindowBuilder::new(app, "about", WebviewUrl::App("/about".into()))
            .title("About")
            .resizable(true)
            .build();
    }
}

pub fn create_or_show_translate_window<R: Runtime, F>(app: &AppHandle<R>, callback: Option<F>)
where
    F: FnOnce() + Send + 'static,
{
    if let Some(window) = app.get_webview_window("translate") {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.set_always_on_top(true);
        if let Some(cb) = callback {
            cb();
        }
    } else {
        const WINDOW_WIDTH: f64 = 400.0;
        const WINDOW_HEIGHT: f64 = 600.0;
        const CURSOR_OFFSET: f64 = 10.0;

        // Use centered position if callback is None, otherwise use mouse-based positioning
        let (adjusted_x, adjusted_y) = if callback.is_none() {
            calculate_center_position(app, WINDOW_WIDTH, WINDOW_HEIGHT)
        } else {
            calculate_window_position(app, WINDOW_WIDTH, WINDOW_HEIGHT, CURSOR_OFFSET)
        };

        let mut builder =
            WebviewWindowBuilder::new(app, "translate", WebviewUrl::App("/translate".into()))
                .title("Translate Window")
                .resizable(true)
                .fullscreen(false)
                .skip_taskbar(true)
                .always_on_top(true)
                .background_color(Color(0, 0, 0, 0))
                .min_inner_size(350.0, 600.0)
                .inner_size(WINDOW_WIDTH, WINDOW_HEIGHT)
                .position(adjusted_x, adjusted_y);

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
                if let Ok(mut cb_option) = callback_for_listener.lock() {
                    if let Some(cb) = cb_option.take() {
                        drop(cb_option);
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

/// Helper function to find which monitor contains a specific position
fn get_monitor_at_position<R: Runtime>(app: &AppHandle<R>, x: i32, y: i32) -> Option<Monitor> {
    if let Ok(monitors) = app.available_monitors() {
        for monitor in monitors {
            let size = monitor.size();
            let position = monitor.position();

            if x >= position.x
                && x <= (position.x + size.width as i32)
                && y >= position.y
                && y <= (position.y + size.height as i32)
            {
                return Some(monitor);
            }
        }
    }

    // Fallback to primary monitor if no match found
    app.primary_monitor().ok().flatten()
}

/// Calculate window position centered on the primary monitor
fn calculate_center_position<R: Runtime>(
    app: &AppHandle<R>,
    width: f64,
    height: f64,
) -> (f64, f64) {
    // Get the primary monitor
    if let Ok(Some(primary_monitor)) = app.primary_monitor() {
        let scale_factor = primary_monitor.scale_factor();

        // Convert physical dimensions to logical dimensions
        let monitor_position = primary_monitor.position();
        let monitor_size = primary_monitor.size();

        let monitor_x = monitor_position.x as f64 / scale_factor;
        let monitor_y = monitor_position.y as f64 / scale_factor;
        let monitor_width = monitor_size.width as f64 / scale_factor;
        let monitor_height = monitor_size.height as f64 / scale_factor;

        // Calculate centered position (with monitor offset)
        let x = monitor_x + (monitor_width - width) / 2.0;
        let y = monitor_y + (monitor_height - height) / 2.0;

        (x, y)
    } else {
        // Fallback to (0, 0) if primary monitor cannot be determined
        (0.0, 0.0)
    }
}

fn calculate_window_position<R: Runtime>(
    app: &AppHandle<R>,
    width: f64,
    height: f64,
    cursor_offset: f64,
) -> (f64, f64) {
    // Get current mouse position (in physical pixels)
    let mouse_position = match Mouse::get_mouse_position() {
        Mouse::Position { x, y } => Position { x, y },
        Mouse::Error => Position { x: 0, y: 0 },
    };

    // Find which monitor the mouse is currently on and calculate position
    get_monitor_at_position(app, mouse_position.x, mouse_position.y)
        .map(|monitor| {
            let scale_factor = monitor.scale_factor();

            // Convert physical coordinates to logical coordinates
            let to_logical = |value: i32| value as f64 / scale_factor;
            let to_logical_f = |value: u32| value as f64 / scale_factor;

            let mouse_x = to_logical(mouse_position.x);
            let mouse_y = to_logical(mouse_position.y);
            let monitor_x = to_logical(monitor.position().x);
            let monitor_y = to_logical(monitor.position().y);
            let monitor_width = to_logical_f(monitor.size().width);
            let monitor_height = to_logical_f(monitor.size().height);
            let monitor_right = monitor_x + monitor_width;
            let monitor_bottom = monitor_y + monitor_height;

            // Calculate relative position within monitor (0.0 to 1.0)
            let relative_x = (mouse_x - monitor_x) / monitor_width;
            let relative_y = (mouse_y - monitor_y) / monitor_height;

            // Smart positioning: prefer opposite side of where cursor is
            let x = if relative_x < 0.5 {
                // Cursor on left half -> try right side
                let right_pos = mouse_x + cursor_offset;
                if right_pos + width <= monitor_right {
                    right_pos
                } else {
                    mouse_x - width - cursor_offset
                }
            } else {
                // Cursor on right half -> try left side
                let left_pos = mouse_x - width - cursor_offset;
                if left_pos >= monitor_x {
                    left_pos
                } else {
                    mouse_x + cursor_offset
                }
            };

            let y = if relative_y < 0.5 {
                // Cursor on top half -> try bottom side
                let bottom_pos = mouse_y + cursor_offset;
                if bottom_pos + height <= monitor_bottom {
                    bottom_pos
                } else {
                    mouse_y - height - cursor_offset
                }
            } else {
                // Cursor on bottom half -> try top side
                let top_pos = mouse_y - height - cursor_offset;
                if top_pos >= monitor_y {
                    top_pos
                } else {
                    mouse_y + cursor_offset
                }
            };

            // Clamp to monitor bounds as final safety check
            let x = x.clamp(monitor_x, monitor_right - width);
            let y = y.clamp(monitor_y, monitor_bottom - height);

            (x, y)
        })
        .unwrap_or((mouse_position.x as f64, mouse_position.y as f64))
}
