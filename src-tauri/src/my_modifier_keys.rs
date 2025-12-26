use crate::utils::text_translation;
use crate::my_windows;
use device_query::{DeviceQuery, DeviceState, Keycode, MouseState};
use std::thread;
use std::time::Duration;
use tauri::AppHandle;
use tauri::Manager;

// 业务逻辑1: 输入法编辑器快捷键
struct InputMethodEditorHandler {
    was_pressed: bool,
}

impl InputMethodEditorHandler {
    fn new() -> Self {
        Self { was_pressed: false }
    }

    fn handle(&mut self, keys: &Vec<Keycode>, app: &AppHandle) {
        #[cfg(target_os = "macos")]
        let is_pressed = keys.contains(&Keycode::RCommand); // On Mac, use Right Command key
        #[cfg(not(target_os = "macos"))]
        let is_pressed = keys.contains(&Keycode::RControl);

        if is_pressed && !self.was_pressed {
            my_windows::window_input_method_editor_show(app);
        } else if !is_pressed && self.was_pressed {
            my_windows::window_input_method_editor_hide(app);
        }

        self.was_pressed = is_pressed;
    }
}

// 业务逻辑2: 翻译气泡快捷键
struct TranslateBubbleHandler {
    was_pressed: bool,
    last_press: Option<std::time::Instant>,
}

impl TranslateBubbleHandler {
    fn new() -> Self {
        Self {
            was_pressed: false,
            last_press: None,
        }
    }

    fn handle(&mut self, keys: &[Keycode], app: &AppHandle) {
        #[cfg(target_os = "macos")]
        let is_pressed = keys.contains(&Keycode::Command);
        #[cfg(not(target_os = "macos"))]
        let is_pressed = keys.contains(&Keycode::CapsLock);

        let now = std::time::Instant::now();

        if is_pressed && !self.was_pressed {
            if let Some(last_press_time) = self.last_press {
                let elapsed = now.duration_since(last_press_time);

                if elapsed.as_millis() < 600 {
                    // 双击间隔有效，触发动作
                    self.trigger_action(app);
                    self.last_press = None; // 触发后清空
                } else {
                    // 间隔太长，视为新的一次点击
                    self.last_press = Some(now);
                }
            } else {
                // 第一次按下
                self.last_press = Some(now);
            }
        }

        self.was_pressed = is_pressed;
    }

    fn trigger_action(&self, app: &AppHandle) {
        let app_clone = app.clone();
        my_windows::window_translate_bubble_show(
            app,
            Some(move || {
                text_translation::translate_selected_text_bubble(&app_clone);
            }),
        );
    }
}
// 业务逻辑3: 点击外部监听器
struct ClickOutsideHandler {
    prev_left_pressed: bool,
}

impl ClickOutsideHandler {
    fn new() -> Self {
        Self {
            prev_left_pressed: false,
        }
    }

    fn handle(&mut self, mouse: &MouseState, app: &AppHandle) {
        if let Some(window) = app.get_webview_window("translate_bubble") {
            // 只有当窗口可见时才需要检测点击外部
            if window.is_visible().unwrap_or(false) {
                let current_left_pressed = mouse.button_pressed[1]; // 1 = 左键

                // 检测到左键"按下瞬间"（从释放到按下），视为一次点击
                if !self.prev_left_pressed && current_left_pressed {
                    let (click_x, click_y) = mouse.coords;

                    if let (Ok(pos), Ok(size)) = (window.outer_position(), window.outer_size()) {
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
                            let _ = crate::utils::input_handling::create_input_data_and_emit(&app, "");
                        }
                    }
                }

                self.prev_left_pressed = current_left_pressed;
            }
        }
    }
}

// 统一的初始化函数
pub fn init_global_input_listener(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let device_state = DeviceState::new();
    let app_clone = app.clone();

    thread::spawn(move || {
        // 初始化三个业务处理器
        let mut ime_handler = InputMethodEditorHandler::new();
        let mut translate_handler = TranslateBubbleHandler::new();
        let mut click_handler = ClickOutsideHandler::new();

        loop {
            // 获取输入状态
            let keys = device_state.get_keys();
            let mouse = device_state.get_mouse();

            // 分别处理三个业务逻辑
            ime_handler.handle(&keys, &app_clone);
            translate_handler.handle(&keys, &app_clone);
            click_handler.handle(&mouse, &app_clone);

            // 统一的轮询间隔
            thread::sleep(Duration::from_millis(70));
        }
    });

    Ok(())
}
