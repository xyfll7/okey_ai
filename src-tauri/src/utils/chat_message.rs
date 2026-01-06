use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Serialize, Clone)]
pub struct LLMChatMessage<'a> {
    pub role: &'a Role,
    pub content: &'a str,
}
/// Represents a chat message with a role and content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: Role,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw: Option<String>,
}

impl ChatMessage {
    pub fn as_llm(&self) -> LLMChatMessage<'_> {
        LLMChatMessage {
            role: &self.role,
            content: &self.content,
        }
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

/// Manages a list of ChatMessage for multi-turn conversations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessageHistory {
    pub messages: Vec<ChatMessage>,
}

impl ChatMessageHistory {
    /// Creates a new empty ChatMessageHistory
    pub fn new() -> Self {
        ChatMessageHistory {
            messages: Vec::new(),
        }
    }

    /// Adds a new message to the history
    pub fn add_message(&mut self, role: Role, content: String, raw: Option<String>) -> &mut Self {
        let message = ChatMessage { role, content, raw };
        self.messages.push(message);
        self
    }

    /// Adds a system message to the history
    pub fn add_system_message(&mut self, content: String, raw: Option<String>) -> &mut Self {
        self.add_message(Role::System, content, raw)
    }

    /// Adds a user message to the history
    pub fn add_user_message(&mut self, content: String, raw: Option<String>) -> &mut Self {
        self.add_message(Role::User, content, raw)
    }

    /// Adds an assistant message to the history
    pub fn add_assistant_message(&mut self, content: String, raw: Option<String>) -> &mut Self {
        self.add_message(Role::Assistant, content, raw)
    }

    /// Converts the history to a vector of ChatMessage
    pub fn to_vec(&self) -> Vec<ChatMessage> {
        self.messages.clone()
    }
}

impl Default for ChatMessageHistory {
    fn default() -> Self {
        Self::new()
    }
}
