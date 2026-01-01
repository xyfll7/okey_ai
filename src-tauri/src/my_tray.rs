use tauri::{
    menu::{MenuBuilder, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Runtime,
};

use crate::{my_config, my_windows};

/*******  ab7e53dc-7cba-45e1-8b3a-3837c9b2580a  *******/
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
            my_windows::window_about_show(app);
        }
        "test" => {
            let config = my_config::get_global_config(app);
            println!("config: {:#?}", config);
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
                        my_windows::window_translate_show(&tray.app_handle(), None as Option<fn()>);
                    }
                    _ => {}
                }
            }
        })
        .build(app_handle)?;

    Ok(())
}
