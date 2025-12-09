use serde_json::json;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

pub fn init_config(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let store = app.store("store.json")?;

    // Note that values must be serde_json::Value instances,
    // otherwise, they will not be compatible with the JavaScript bindings.
    store.set("some-key", json!({ "value": 5 }));

    // Get a value from the store.
    let value = store
        .get("some-key")
        .expect("Failed to get value from store");
    println!("{}", value); // {"value":5}

    // Remove the store from the resource table
    store.close_resource();
    Ok(())
}
