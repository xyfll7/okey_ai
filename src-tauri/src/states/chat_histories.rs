use crate::utils::chat_message::{ChatMessage, ChatMessageHistory};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::sync::Arc;
use tauri::async_runtime::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct InnerState {
    histories: BTreeMap<String, ChatMessageHistory>,
}

#[derive(Clone)]
pub struct ChatHistoriesState(Arc<RwLock<InnerState>>);

impl ChatHistoriesState {
    pub fn new() -> Self {
        Self(Arc::new(RwLock::new(InnerState {
            histories: BTreeMap::new(),
        })))
    }

    /// Add a system message to a specific chat history
    pub async fn add_system_message(&self, key: &str, content: String, raw: Option<String>) {
        let mut state = self.0.write().await;
        state
            .histories
            .entry(key.to_string())
            .or_insert_with(ChatMessageHistory::new)
            .add_system_message(content, raw);
    }

    /// Add a user message to a specific chat history
    pub async fn add_user_message(&self, key: &str, content: String, raw: Option<String>) {
        let mut state = self.0.write().await;
        state
            .histories
            .entry(key.to_string())
            .or_insert_with(ChatMessageHistory::new)
            .add_user_message(content, raw);
    }

    /// Add an assistant message to a specific chat history
    pub async fn add_assistant_message(&self, key: &str, content: String, raw: Option<String>) {
        let mut state = self.0.write().await;
        state
            .histories
            .entry(key.to_string())
            .or_insert_with(ChatMessageHistory::new)
            .add_assistant_message(content, raw);
    }

    /// Get messages from a specific chat history
    pub async fn get_messages(&self, key: &str) -> Option<Vec<ChatMessage>> {
        let state = self.0.read().await;
        state.histories.get(key).map(|h| h.to_vec())
    }

    /// Get all histories (for commands that need to return all data)
    pub async fn get_all_histories(&self) -> BTreeMap<String, ChatMessageHistory> {
        self.0.read().await.histories.clone()
    }
}

impl Default for ChatHistoriesState {
    fn default() -> Self {
        Self::new()
    }
}
