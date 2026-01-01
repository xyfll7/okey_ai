use crate::utils::chat_message::{ChatMessage, ChatMessageHistory};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::async_runtime::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatHistoriesState {
    pub histories: std::collections::HashMap<String, ChatMessageHistory>,
}

impl ChatHistoriesState {
    pub fn new() -> Self {
        Self {
            histories: std::collections::HashMap::new(),
        }
    }

    /// Get or create a chat history for a specific key
    pub fn get_or_create_history(&mut self, key: &str) -> &mut ChatMessageHistory {
        self.histories
            .entry(key.to_string())
            .or_insert_with(ChatMessageHistory::new)
    }

    /// Get a chat history for a specific key
    pub fn get_history(&self, key: &str) -> Option<&ChatMessageHistory> {
        self.histories.get(key)
    }

    /// Remove a chat history for a specific key
    pub fn remove_history(&mut self, key: &str) {
        self.histories.remove(key);
    }

    /// Clear all chat histories
    pub fn clear_all(&mut self) {
        self.histories.clear();
    }
}

impl Default for ChatHistoriesState {
    fn default() -> Self {
        Self::new()
    }
}

/// Global chat histories manager
#[derive(Clone)] // ← 添加这一行
pub struct GlobalChatHistories(pub Arc<RwLock<ChatHistoriesState>>);

impl GlobalChatHistories {
    pub fn new() -> Self {
        Self(Arc::new(RwLock::new(ChatHistoriesState::new())))
    }
    /// Add a message to a specific chat history
    pub async fn add_message(
        &self,
        key: &str,
        role: crate::utils::chat_message::Role,
        content: String,
        raw: Option<String>,
    ) {
        let mut state = self.0.write().await;
        let history = state.get_or_create_history(key);
        history.add_message(role, content, raw);
    }

    /// Add a system message to a specific chat history
    pub async fn add_system_message(&self, key: &str, content: String, raw: Option<String>) {
        let mut state = self.0.write().await;
        let history = state.get_or_create_history(key);
        history.add_system_message(content, raw);
    }

    /// Add a user message to a specific chat history
    pub async fn add_user_message(&self, key: &str, content: String, raw: Option<String>) {
        let mut state = self.0.write().await;
        let history = state.get_or_create_history(key);
        history.add_user_message(content, raw);
    }

    /// Add an assistant message to a specific chat history
    pub async fn add_assistant_message(&self, key: &str, content: String, raw: Option<String>) {
        let mut state = self.0.write().await;
        let history = state.get_or_create_history(key);
        history.add_assistant_message(content, raw);
    }

    /// Get messages from a specific chat history
    pub async fn get_messages(&self, key: &str) -> Option<Vec<ChatMessage>> {
        let state = self.0.read().await;
        state.get_history(key).map(|h| h.to_vec())
    }

    /// Remove a chat history for a specific key
    pub async fn remove_history(&self, key: &str) {
        let mut state = self.0.write().await;
        state.remove_history(key);
    }

    /// Clear all chat histories
    pub async fn clear_all(&self) {
        let mut state = self.0.write().await;
        state.clear_all();
    }
}
