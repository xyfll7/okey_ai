// src/my_reqwest.rs

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};
use tauri_plugin_http::reqwest;

// -----------------------
// 数据结构
// -----------------------

#[derive(Debug, Serialize, Deserialize)]
pub struct MyGetResponse {
    pub message: String,
    pub time: u64,
}

#[derive(Debug, Serialize)]
pub struct MyPostPayload {
    pub keyword: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MyPostResponse {
    pub success: bool,
    pub data: String,
}

// -----------------------
// GET 示例
// -----------------------
#[tauri::command]
pub async fn http_get_example<R: Runtime>(_app: AppHandle<R>,) -> Result<MyGetResponse, String> {
    let client = reqwest::Client::new();

    let resp = client
        .get("http://127.0.0.1:3000")
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    let text = resp
        .text()
        .await
        .map_err(|e| format!("读取响应失败: {}", e))?;
    println!("Response Text:++++____________ {}", text);
    serde_json::from_str::<MyGetResponse>(&text).map_err(|e| format!("JSON 解析失败: {}", e))
}

// -----------------------
// POST 示例
// -----------------------
#[tauri::command]
pub async fn http_post_example(_app: AppHandle, keyword: String) -> Result<MyPostResponse, String> {
    let client = reqwest::Client::new();

    let payload = MyPostPayload { keyword };

    let resp = client
        .post("http://127.0.0.1:3000")
        .body(serde_json::to_string(&payload).unwrap())
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    let text = resp
        .text()
        .await
        .map_err(|e| format!("读取响应失败: {}", e))?;
    println!("Response Text:____________ {}", text);

    serde_json::from_str::<MyPostResponse>(&text).map_err(|e| format!("JSON 解析失败: {}", e))
}
