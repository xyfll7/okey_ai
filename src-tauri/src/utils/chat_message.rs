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

/// A single user turn: the original source text (`raw`, optional, kept for
/// display) and the `prompt` that is actually forwarded to the model.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserTurn {
    #[serde(default)]
    pub raw: String,
    pub prompt: String,
}

/// Mirrors the `UIMessage` type of @tanstack/ai, so the frontend can consume it directly
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UIMessage {
    pub id: String,
    pub role: Role,
    pub parts: Vec<MessagePart>,
}

impl UIMessage {
    pub fn new_parts(id: String, role: Role, parts: Vec<MessagePart>) -> Self {
        UIMessage { id, role, parts }
    }

    /// Build the LLM message. For user messages the **last** part is the
    /// assembled prompt that is actually sent to the model; earlier parts
    /// (e.g. the raw source text) are display-only metadata and must not be
    /// duplicated into the request.
    pub fn as_llm(&self) -> LLMChatMessage {
        let content = self
            .parts
            .iter()
            .rev()
            .find_map(|part| match part {
                MessagePart::Text { content } => Some(content.clone()),
            })
            .unwrap_or_default();
        LLMChatMessage { role: self.role.clone(), content }
    }
}

/// Retrieve the plain text content of the last assistant message in the history.
pub fn last_assistant_text(histories: &[UIMessage]) -> Option<String> {
    histories.iter().rev().find(|m| m.role == Role::Assistant).map(|m| {
        m.parts
            .iter()
            .filter_map(|p| match p {
                MessagePart::Text { content } => Some(content.clone()),
            })
            .collect::<String>()
    })
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

    /// Adds a new single-text message to the history (index-based stable id)
    pub fn add_message(&mut self, role: Role, content: String) -> &mut Self {
        self.add_message_parts(role, vec![MessagePart::Text { content }])
    }

    /// Adds a message built from explicit parts, e.g. `[raw, assembled_prompt]`
    pub fn add_message_parts(&mut self, role: Role, parts: Vec<MessagePart>) -> &mut Self {
        let id = format!("msg-{}", self.messages.len());
        self.messages.push(UIMessage::new_parts(id, role, parts));
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
