use std::{
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::Emitter;
use tauri::{
    window::Color, AppHandle, Listener, LogicalSize, Manager, PhysicalPosition, Runtime,
    WebviewUrl, WebviewWindowBuilder,
};

use crate::{my_events::event_names, states::setting_states};
use mouse_position::mouse_position::{Mouse, Position};
use tauri::Monitor;

pub fn window_input_method_editor_show<R: Runtime>(app: &AppHandle<R>) {
    const WINDOW_WIDTH: f64 = 13.0;
    const WINDOW_HEIGHT: f64 = 13.0;
    const CURSOR_OFFSET: f64 = 0.0;

    if let Some(window) = app.get_webview_window("input_method_editor") {
        let size = LogicalSize::new(WINDOW_WIDTH, WINDOW_HEIGHT);
        let _ = window.set_size(size);
        let _ = window.set_min_size(Some(size));
        let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));

        let (logical_x, logical_y) =
            calculate_window_position(app, WINDOW_WIDTH, WINDOW_HEIGHT, CURSOR_OFFSET);

        let mut target_scale = 1.0;

        if let Ok(monitors) = window.available_monitors() {
            for monitor in monitors {
                let pos = monitor.position();
                let size_mon = monitor.size();
                let scale = monitor.scale_factor();

                let mon_x = pos.x as f64 / scale;
                let mon_y = pos.y as f64 / scale;
                let mon_w = size_mon.width as f64 / scale;
                let mon_h = size_mon.height as f64 / scale;

                if logical_x >= mon_x
                    && logical_x < mon_x + mon_w
                    && logical_y >= mon_y
                    && logical_y < mon_y + mon_h
                {
                    target_scale = scale;
                    break;
                }
            }
        }

        let physical_x = (logical_x * target_scale) as i32;
        let physical_y = (logical_y * target_scale) as i32;

        let _ = window.set_position(tauri::Position::Physical(PhysicalPosition {
            x: physical_x,
            y: physical_y,
        }));

        let _ = window.show();
        let _ = window.set_always_on_top(true);
    }
}

pub fn window_input_method_editor_hide<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("input_method_editor") {
        let _ = window.hide();
    }
}

pub const WINDOW_HEIGHT_TRANSLATE_BUBBLE: f64 = 36.0;
pub fn window_translate_bubble_show<R: Runtime, F>(app: &AppHandle<R>, callback: Option<F>)
where
    F: FnOnce() + Send + 'static,
{
    const WINDOW_WIDTH: f64 = 170.0;
    const CURSOR_OFFSET: f64 = 17.0;

    if let Some(window) = app.get_webview_window("translate_bubble") {
        let size = LogicalSize::new(WINDOW_WIDTH, WINDOW_HEIGHT_TRANSLATE_BUBBLE);
        let _ = window.set_size(size);
        let _ = window.set_min_size(Some(size));
        let _ = window.set_max_size(Some(LogicalSize::new(
            10_000.0,
            WINDOW_HEIGHT_TRANSLATE_BUBBLE,
        )));
        let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));

        let (logical_x, logical_y) = calculate_window_position(
            app,
            WINDOW_WIDTH,
            WINDOW_HEIGHT_TRANSLATE_BUBBLE,
            CURSOR_OFFSET,
        );

        let mut target_scale = 1.0;

        if let Ok(monitors) = window.available_monitors() {
            for monitor in monitors {
                let pos = monitor.position();
                let size_mon = monitor.size();
                let scale = monitor.scale_factor();

                let mon_x = pos.x as f64 / scale;
                let mon_y = pos.y as f64 / scale;
                let mon_w = size_mon.width as f64 / scale;
                let mon_h = size_mon.height as f64 / scale;

                if logical_x >= mon_x
                    && logical_x < mon_x + mon_w
                    && logical_y >= mon_y
                    && logical_y < mon_y + mon_h
                {
                    target_scale = scale;
                    break;
                }
            }
        }

        let physical_x = (logical_x * target_scale) as i32;
        let physical_y = (logical_y * target_scale) as i32;

        let _ = window.set_position(tauri::Position::Physical(PhysicalPosition {
            x: physical_x,
            y: physical_y,
        }));

        let _ = window.show();
        let _ = window.set_always_on_top(true);

        if let Some(cb) = callback {
            cb();
        }
    }
}

pub fn window_translate_show<R: Runtime, F>(app: &AppHandle<R>, callback: Option<F>)
where
    F: FnOnce() + Send + 'static,
{
    if let Some(window) = app.get_webview_window("translate_bubble") {
        let _ = window.hide();
        let _ = app.emit(event_names::BUBBLE_CLEAN, {});
    }

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
                .min_inner_size(350.0, 600.0)
                .background_color(Color(0, 0, 0, 1))
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
                            let state = state_handle.state::<Mutex<setting_states::AppState>>();
                            let state_guard = state.lock().unwrap();
                            !state_guard.auto_close_translate
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

pub fn window_about_show<R: Runtime>(app: &AppHandle<R>) {
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

fn get_monitor_at_position<R: Runtime>(app: &AppHandle<R>, x: i32, y: i32) -> Option<Monitor> {
    if let Ok(monitors) = app.available_monitors() {
        for monitor in monitors {
            let size = monitor.size();
            let position = monitor.position();

            if x >= position.x
                && x < position.x + size.width as i32
                && y >= position.y
                && y < position.y + size.height as i32
            {
                return Some(monitor);
            }
        }
    }

    app.primary_monitor().ok().flatten()
}

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
    let mouse_position = match Mouse::get_mouse_position() {
        Mouse::Position { x, y } => Position { x, y },
        Mouse::Error => Position { x: 0, y: 0 },
    };

    match get_monitor_at_position(app, mouse_position.x, mouse_position.y) {
        Some(monitor) => {
            let scale_factor = monitor.scale_factor();

            // 辅助函数：物理像素转逻辑像素
            let to_logical = |value: i32| value as f64 / scale_factor;
            let to_logical_f = |value: u32| value as f64 / scale_factor;

            // 鼠标位置（逻辑像素）
            let mouse_x = to_logical(mouse_position.x);
            let mouse_y = to_logical(mouse_position.y);

            // 显示器边界（逻辑像素）
            let monitor_x = to_logical(monitor.position().x);
            let monitor_y = to_logical(monitor.position().y);
            let monitor_width = to_logical_f(monitor.size().width);
            let monitor_height = to_logical_f(monitor.size().height);
            let monitor_right = monitor_x + monitor_width;
            let monitor_bottom = monitor_y + monitor_height;

            // 鼠标在显示器中的相对位置 (0.0 ~ 1.0)
            let relative_x = (mouse_x - monitor_x) / monitor_width;
            let relative_y = (mouse_y - monitor_y) / monitor_height;

            // 智能X轴定位：鼠标在左半边时窗口显示在右边，反之亦然
            let x = if relative_x < 0.5 {
                // 鼠标在左半边，尝试放在右边
                let right_pos = mouse_x + cursor_offset;
                if right_pos + width <= monitor_right {
                    right_pos
                } else {
                    // 右边放不下，放在左边
                    (mouse_x - width - cursor_offset).max(monitor_x)
                }
            } else {
                // 鼠标在右半边，尝试放在左边
                let left_pos = mouse_x - width - cursor_offset;
                if left_pos >= monitor_x {
                    left_pos
                } else {
                    // 左边放不下，放在右边
                    (mouse_x + cursor_offset).min(monitor_right - width)
                }
            };

            // 智能Y轴定位：鼠标在上半边时窗口显示在下边，反之亦然
            let y = if relative_y < 0.5 {
                // 鼠标在上半边，尝试放在下边
                let bottom_pos = mouse_y + cursor_offset;
                if bottom_pos + height <= monitor_bottom {
                    bottom_pos
                } else {
                    // 下边放不下，放在上边
                    (mouse_y - height - cursor_offset).max(monitor_y)
                }
            } else {
                // 鼠标在下半边，尝试放在上边
                let top_pos = mouse_y - height - cursor_offset;
                if top_pos >= monitor_y {
                    top_pos
                } else {
                    // 上边放不下，放在下边
                    (mouse_y + cursor_offset).min(monitor_bottom - height)
                }
            };

            // 最终边界夹紧（防御性编程）
            let x = x.clamp(monitor_x, monitor_right - width);
            let y = y.clamp(monitor_y, monitor_bottom - height);

            (x, y)
        }
        None => {
            // 没有找到对应的显示器，使用默认逻辑
            // 优化：尝试获取主显示器
            if let Ok(Some(monitor)) = app.primary_monitor() {
                let scale = monitor.scale_factor();
                let logical_x = mouse_position.x as f64 / scale;
                let logical_y = mouse_position.y as f64 / scale;
                (logical_x, logical_y)
            } else {
                // 最后的回退：使用物理像素（可能在高DPI屏幕上不准确）
                (mouse_position.x as f64, mouse_position.y as f64)
            }
        }
    }
}
