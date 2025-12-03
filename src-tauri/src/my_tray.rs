use crate::my_reqwest;
use tauri::async_runtime;
use tauri::{
    menu::{MenuBuilder, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Runtime,
};

use crate::my_windows::{create_or_show_about_window, create_or_show_main_window};

pub fn create_tray<R: Runtime>(app_handle: &AppHandle<R>) -> tauri::Result<()> {
    // 创建菜单项
    let show_item = MenuItem::with_id(app_handle, "show", "Show", true, None::<&str>)?;
    let test_item = MenuItem::with_id(app_handle, "test", "Test", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app_handle, "quit", "Quit", true, None::<&str>)?;

    // 构建菜单
    let menu = MenuBuilder::new(app_handle)
        .item(&show_item)
        .item(&test_item)
        .separator()
        .item(&quit_item)
        .build()?;

    // 菜单点击事件
    app_handle.on_menu_event(|app, event| match event.id().as_ref() {
        "show" => {
            create_or_show_about_window(app);
        }
        "test" => {
            let app = app.clone(); // Clone 会得到一个 AppHandle<R>
            async_runtime::spawn(async move {
                match my_reqwest::http_get_example(app).await {
                    Ok(result) => {
                        println!("HTTP request succeeded! Result: {:?}", result.message);
                    }
                    Err(e) => {
                        eprintln!("HTTP request failed: {}", e);
                    }
                }
                println!("Test menu item clicked and request completed");
            });
            println!("Test menu item clicked (request started)");
        }
        "quit" => std::process::exit(0),
        _ => {}
    });

    // 创建系统托盘
    TrayIconBuilder::new()
        .icon(app_handle.default_window_icon().cloned().unwrap())
        .menu(&menu) // 绑定菜单
        .show_menu_on_left_click(false) // 新 API：关闭左键自动弹出菜单
        .on_tray_icon_event(move |tray, event| {
            if let TrayIconEvent::Click {
                button,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                match button {
                    MouseButton::Left => {
                        create_or_show_main_window(&tray.app_handle(), None as Option<fn()>);
                    }
                    _ => {}
                }
            }
        })
        .build(app_handle)?;

    Ok(())
}
