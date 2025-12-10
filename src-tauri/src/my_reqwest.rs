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
