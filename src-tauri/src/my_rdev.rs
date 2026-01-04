use crate::my_events::event_names;
use crate::my_windows;
use crate::utils::text_translation;
use rdev::{listen, Button, Event, EventType, Key};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use std::time::Instant;
use tauri::AppHandle;
use tauri::Emitter;
use tauri::Manager;

struct GlobalState {
    ime_handler: InputMethodEditorHandler,
    translate_bubble_handler: TranslateBubbleHandler,
    click_outside_handler: ClickOutsideHandler,
}

struct InputMethodEditorHandler {
    was_pressed: bool,
    press_start_time: Option<Instant>,
}

impl InputMethodEditorHandler {
    fn new() -> Self {
        Self {
            was_pressed: false,
            press_start_time: None,
        }
    }

    fn handle(&mut self, is_pressed: bool, app: &AppHandle) {
        // 按键状态变化处理
        if is_pressed && !self.was_pressed {
            // 记录按键按下的开始时间
            self.press_start_time = Some(Instant::now());
        } else if !is_pressed && self.was_pressed {
            // 按键抬起，清除计时器
            self.press_start_time = None;
            my_windows::window_input_method_editor_hide(app);
        } else if is_pressed && self.was_pressed {
            // 按键持续按下，检查是否超过800毫秒
            if let Some(start_time) = self.press_start_time {
                if start_time.elapsed() >= Duration::from_millis(800) {
                    my_windows::window_input_method_editor_show(app);
                    // 执行后清除计时器，避免重复触发
                    self.press_start_time = None;
                }
            }
        }

        self.was_pressed = is_pressed;
    }
}

struct TranslateBubbleHandler {
    was_pressed: bool,
    last_release_time: Option<Instant>,
    double_click_timeout: u128,
}

impl TranslateBubbleHandler {
    fn new() -> Self {
        Self {
            was_pressed: false,
            last_release_time: None,
            double_click_timeout: 1000,
        }
    }

    fn handle(&mut self, is_pressed: bool, app: &AppHandle) {
        let now = Instant::now();

        if !is_pressed && self.was_pressed {
            if let Some(last_release) = self.last_release_time {
                let elapsed = now.duration_since(last_release);

                if elapsed.as_millis() < self.double_click_timeout {
                    self.trigger_action(app);
                    println!("弹窗打开了")
                }
            }
            self.last_release_time = Some(now);
        }

        self.was_pressed = is_pressed;
    }

    fn trigger_action(&self, app: &AppHandle) {
        let app_clone = app.clone();

        thread::spawn(move || {
            let app_clone2 = app_clone.clone();
            my_windows::window_translate_bubble_show(
                &app_clone,
                Some(move || {
                    text_translation::translate_selected_text_bubble(&app_clone2);
                }),
            );
        });
    }
}

struct ClickOutsideHandler {
    mouse_x: i32,
    mouse_y: i32,
}

impl ClickOutsideHandler {
    fn new() -> Self {
        Self {
            mouse_x: 0,
            mouse_y: 0,
        }
    }

    fn update_mouse_position(&mut self, x: f64, y: f64) {
        self.mouse_x = x as i32;
        self.mouse_y = y as i32;
    }

    fn handle_click(&mut self, app: &AppHandle) {
        if let Some(window) = app.get_webview_window("translate_bubble") {
            if window.is_visible().unwrap_or(false) {
                if let (Ok(pos), Ok(size)) = (window.outer_position(), window.outer_size()) {
                    let win_x = pos.x;
                    let win_y = pos.y;
                    let win_w = size.width as i32;
                    let win_h = size.height as i32;

                    let inside = self.mouse_x >= win_x
                        && self.mouse_x <= win_x + win_w
                        && self.mouse_y >= win_y
                        && self.mouse_y <= win_y + win_h;

                    if !inside {
                        let _ = window.hide();
                        let _ = app.emit(event_names::BUBBLE_CLEAN, {});
                    }
                }
            }
        }
    }
}

pub fn init_global_input_listener(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_clone = app.clone();

    let global_state = Arc::new(Mutex::new(GlobalState {
        ime_handler: InputMethodEditorHandler::new(),
        translate_bubble_handler: TranslateBubbleHandler::new(),
        click_outside_handler: ClickOutsideHandler::new(),
    }));

    let state_clone = global_state.clone();

    thread::spawn(move || {
        let app = app_clone;

        let callback = move |event: Event| {
            let mut state = state_clone.lock().unwrap();

            match event.event_type {
                EventType::KeyPress(key) => {
                    #[cfg(target_os = "macos")]
                    let is_target_key = matches!(key, Key::MetaRight);
                    #[cfg(not(target_os = "macos"))]
                    let is_target_key = matches!(key, Key::ControlRight);

                    if is_target_key {
                        state.ime_handler.handle(true, &app);
                        state.translate_bubble_handler.handle(true, &app);
                    }
                }
                EventType::KeyRelease(key) => {
                    #[cfg(target_os = "macos")]
                    let is_target_key = matches!(key, Key::MetaRight);
                    #[cfg(not(target_os = "macos"))]
                    let is_target_key = matches!(key, Key::ControlRight);

                    if is_target_key {
                        state.ime_handler.handle(false, &app);
                        state.translate_bubble_handler.handle(false, &app);
                    }
                }
                EventType::MouseMove { x, y } => {
                    state.click_outside_handler.update_mouse_position(x, y);
                }
                EventType::ButtonPress(Button::Left) => {
                    state.click_outside_handler.handle_click(&app);
                }
                _ => {
                    println!("点击了");
                }
            }
        };

        if let Err(error) = listen(callback) {
            eprintln!("rdev监听错误: {:?}", error);
        }
    });

    let state_clone2 = global_state.clone();
    let app_clone2 = app.clone();
    thread::spawn(move || loop {
        {
            let mut state = state_clone2.lock().unwrap();
            if state.ime_handler.was_pressed {
                state.ime_handler.handle(true, &app_clone2);
            }
        }
        thread::sleep(Duration::from_millis(16));
    });

    Ok(())
}
