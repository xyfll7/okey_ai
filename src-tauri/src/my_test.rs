use tauri::AppHandle;
extern crate device_query;
use device_query::{DeviceQuery, DeviceState, Keycode};
use std::thread;
use std::time::Duration;

use crate::my_windows;
pub fn set_shortcuts(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let device_state = DeviceState::new();
    let mut was_pressed = false;
    let app_clone = app.clone();

    thread::spawn(move || {
        loop {
            let keys = device_state.get_keys();
            let is_pressed = keys.contains(&Keycode::RControl);

            if is_pressed && !was_pressed {
                println!("✅ ControlRight KeyPress");
                // 执行按下逻辑
                my_windows::window_input_method_editor_show(&app_clone);
            } else if !is_pressed && was_pressed {
                println!("✅ ControlRight KeyRelease");
                my_windows::window_input_method_editor_hide(&app_clone);
                // 执行释放逻辑
            }

            was_pressed = is_pressed;
            thread::sleep(Duration::from_millis(10)); // 轮询间隔
        }
    });

    Ok(())
}
