use crate::utils::chat_message::{ChatMessage, ChatMessageHistory};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::async_runtime::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatHistoryState {
    pub histories: std::collections::HashMap<String, ChatMessageHistory>,
}

impl ChatHistoryState {
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
    #[allow(dead_code)]
    pub fn remove_history(&mut self, key: &str) {
        self.histories.remove(key);
    }

    /// Clear all chat histories
    #[allow(dead_code)]
    pub fn clear_all(&mut self) {
        self.histories.clear();
    }
}

impl Default for ChatHistoryState {
    fn default() -> Self {
        Self::new()
    }
}

/// Global chat history manager
pub struct GlobalChatHistory(pub Arc<RwLock<ChatHistoryState>>);

impl GlobalChatHistory {
    pub fn new() -> Self {
        Self(Arc::new(RwLock::new(ChatHistoryState::new())))
    }

    /// Get or create a chat history for a specific key
    #[allow(dead_code)]
    pub async fn get_or_create_history(&self, key: &str) -> ChatMessageHistory {
        let mut state = self.0.write().await;
        state.get_or_create_history(key).clone()
    }

    /// Add a message to a specific chat history
    #[allow(dead_code)]
    pub async fn add_message(
        &self,
        key: &str,
        role: crate::utils::chat_message::Role,
        content: String,
    ) {
        let mut state = self.0.write().await;
        let history = state.get_or_create_history(key);
        history.add_message(role, content);
    }

    /// Add a system message to a specific chat history
    pub async fn add_system_message(&self, key: &str, content: String) {
        let mut state = self.0.write().await;
        let history = state.get_or_create_history(key);
        history.add_system_message(content);
    }

    /// Add a user message to a specific chat history
    pub async fn add_user_message(&self, key: &str, content: String) {
        let mut state = self.0.write().await;
        let history = state.get_or_create_history(key);
        history.add_user_message(content);
    }

    /// Add an assistant message to a specific chat history
    pub async fn add_assistant_message(&self, key: &str, content: String) {
        let mut state = self.0.write().await;
        let history = state.get_or_create_history(key);
        history.add_assistant_message(content);
    }

    /// Get messages from a specific chat history
    pub async fn get_messages(&self, key: &str) -> Option<Vec<ChatMessage>> {
        let state = self.0.read().await;
        state.get_history(key).map(|h| h.to_vec())
    }

    /// Remove a chat history for a specific key
    #[allow(dead_code)]
    pub async fn remove_history(&self, key: &str) {
        let mut state = self.0.write().await;
        state.remove_history(key);
    }

    /// Clear all chat histories
    #[allow(dead_code)]
    pub async fn clear_all(&self) {
        let mut state = self.0.write().await;
        state.clear_all();
    }
}
