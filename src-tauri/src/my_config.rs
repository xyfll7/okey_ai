use serde_json::json;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

pub fn init_config(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let store = app.store("store.json")?;
    if let Some(value) = store.get("some-key") {
        println!("读取到现有配置: {}", value);
    } else {
        println!("没有找到配置，创建默认值");
        store.set("some-key", json!({ "value": 9 }));
    }
    let final_value = store.get("some-key").unwrap();
    println!("最终配置值: {}", final_value);
    Ok(())
}
