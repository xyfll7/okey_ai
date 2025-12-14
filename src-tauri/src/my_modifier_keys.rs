use crate::my_utils;
use crate::my_windows;
use device_query::MouseState;
use device_query::{DeviceQuery, DeviceState, Keycode};
use std::thread;
use std::time::Duration;
use tauri::AppHandle;
use tauri::Manager;

pub fn set_shortcuts(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let device_state = DeviceState::new();
    let mut was_pressed = false;
    let app_clone = app.clone();

    thread::spawn(move || {
        loop {
            let keys = device_state.get_keys();
            let is_pressed = keys.contains(&Keycode::RControl);
            if is_pressed && !was_pressed {
                my_windows::window_input_method_editor_show(&app_clone);
            } else if !is_pressed && was_pressed {
                my_windows::window_input_method_editor_hide(&app_clone);
            }
            was_pressed = is_pressed;
            thread::sleep(Duration::from_millis(10)); // 轮询间隔
        }
    });

    Ok(())
}

pub fn set_shortcuts_for_translate_bubble(
    app: &AppHandle,
) -> Result<(), Box<dyn std::error::Error>> {
    let device_state = DeviceState::new();
    let mut was_pressed = false;
    let app_clone = app.clone();

    thread::spawn(move || {
        loop {
            let keys = device_state.get_keys();
            let is_pressed = keys.contains(&Keycode::RAlt);
            if is_pressed && !was_pressed {
                // Create a clone for use in the callback closure
                let app_for_callback = app_clone.clone();
                my_windows::window_translate_bubble_show(
                    &app_clone,
                    Some(move || {
                        my_utils::translate_selected_text_for_translate_bubble(&app_for_callback);
                    }),
                );
            } else if !is_pressed && was_pressed {
                // my_windows::window_translate_bubble_hide(&app_clone);
            }
            was_pressed = is_pressed;
            thread::sleep(Duration::from_millis(100)); // 轮询间隔
        }
    });

    Ok(())
}

pub fn init_click_outside_listener(app: &AppHandle) {
    let app_handle = app.clone();

    thread::spawn(move || {
        let device_state = DeviceState::new();
        let mut prev_left_pressed = false; // 记录上一帧左键状态，用于边缘检测点击

        loop {
            // 获取 translate_bubble 窗口（如果不存在或未创建，会返回 None）
            if let Some(window) = app_handle.get_webview_window("translate_bubble") {
                // 只有当窗口可见时才需要检测点击外部
                if window.is_visible().unwrap_or(false) {
                    let mouse: MouseState = device_state.get_mouse();
                    let current_left_pressed = mouse.button_pressed[1]; // 1 = 左键

                    // 检测到左键“按下瞬间”（从释放到按下），视为一次点击
                    if !prev_left_pressed && current_left_pressed {
                        let (click_x, click_y) = mouse.coords;

                        if let (Ok(pos), Ok(size)) = (window.outer_position(), window.outer_size())
                        {
                            let win_x = pos.x;
                            let win_y = pos.y;
                            let win_w = size.width as i32;
                            let win_h = size.height as i32;

                            // 判断点击是否在窗口内部
                            let inside = click_x >= win_x
                                && click_x <= win_x + win_w
                                && click_y >= win_y
                                && click_y <= win_y + win_h;

                            // 如果点击在外部 → 隐藏窗口
                            if !inside {
                                let _ = window.hide();
                            }
                        }
                    }

                    prev_left_pressed = current_left_pressed;
                }
            }

            // 轮询间隔：20ms 足够灵敏，CPU 占用极低
            thread::sleep(Duration::from_millis(20));
        }
    });
}
