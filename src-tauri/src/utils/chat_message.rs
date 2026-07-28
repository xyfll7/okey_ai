use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Serialize, Clone)]
pub struct LLMChatMessage {
    pub role: Role,
    pub content: String,
}
/// A part of a UIMessage, mirrors the `MessagePart` type of @tanstack/ai
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum MessagePart {
    Text { content: String },
}

/// Mirrors the `UIMessage` type of @tanstack/ai, so the frontend can consume it directly
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UIMessage {
    pub id: String,
    pub role: Role,
    pub parts: Vec<MessagePart>,
}

impl UIMessage {
    pub fn new_text(id: String, role: Role, content: String) -> Self {
        UIMessage { id, role, parts: vec![MessagePart::Text { content }] }
    }

    /// Concatenated text content of all text parts
    pub fn text(&self) -> String {
        self.parts
            .iter()
            .map(|part| match part {
                MessagePart::Text { content } => content.as_str(),
            })
            .collect()
    }

    pub fn as_llm(&self) -> LLMChatMessage {
        LLMChatMessage { role: self.role.clone(), content: self.text() }
    }
}

/// Represents the role of a participant in the conversation
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    System,
    User,
    Assistant,
}

impl fmt::Display for Role {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Role::System => write!(f, "system"),
            Role::User => write!(f, "user"),
            Role::Assistant => write!(f, "assistant"),
        }
    }
}

impl From<Role> for String {
    fn from(role: Role) -> Self {
        role.to_string()
    }
}

impl From<&Role> for String {
    fn from(role: &Role) -> Self {
        role.to_string()
    }
}

impl From<String> for Role {
    fn from(s: String) -> Self {
        match s.as_str() {
            "system" => Role::System,
            "user" => Role::User,
            "assistant" => Role::Assistant,
            _ => Role::User, // Default to user for unknown roles
        }
    }
}

impl<'a> From<&'a str> for Role {
    fn from(s: &'a str) -> Self {
        match s {
            "system" => Role::System,
            "user" => Role::User,
            "assistant" => Role::Assistant,
            _ => Role::User, // Default to user for unknown roles
        }
    }
}

/// Manages a list of UIMessage for multi-turn conversations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessageHistory {
    pub messages: Vec<UIMessage>,
}

impl ChatMessageHistory {
    pub fn new() -> Self {
        ChatMessageHistory { messages: Vec::new() }
    }

    /// Adds a new text message to the history (index-based stable id)
    pub fn add_message(&mut self, role: Role, content: String) -> &mut Self {
        let id = format!("msg-{}", self.messages.len());
        self.messages.push(UIMessage::new_text(id, role, content));
        self
    }

    /// Converts the history to a vector of UIMessage
    pub fn to_vec(&self) -> Vec<UIMessage> {
        self.messages.clone()
    }
}

impl Default for ChatMessageHistory {
    fn default() -> Self {
        Self::new()
    }
}
