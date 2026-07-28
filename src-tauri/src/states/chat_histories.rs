use crate::utils::chat_message::{ChatMessageHistory, MessagePart, Role, UIMessage};
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
        Self(Arc::new(RwLock::new(InnerState { histories: BTreeMap::new() })))
    }

    /// Add a message to a specific chat history
    pub async fn add_message(&self, key: &str, role: Role, content: String) -> &Self {
        let mut state = self.0.write().await;
        state.histories.entry(key.to_string()).or_insert_with(ChatMessageHistory::new).add_message(role, content);
        self
    }

    /// Adds a message built from explicit parts (e.g. raw text + assembled prompt)
    pub async fn add_message_parts(&self, key: &str, role: Role, parts: Vec<MessagePart>) -> &Self {
        let mut state = self.0.write().await;
        state.histories.entry(key.to_string()).or_insert_with(ChatMessageHistory::new).add_message_parts(role, parts);
        self
    }

    /// Get messages from a specific chat history
    pub async fn get_messages(&self, key: &str) -> Option<Vec<UIMessage>> {
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
