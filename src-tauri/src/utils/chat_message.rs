use serde::{Deserialize, Serialize};
use std::fmt;

/// Represents a chat message with a role and content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: Role,
    pub content: String,
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

    /// Creates a new ChatMessageHistory with initial messages
    pub fn with_messages(messages: Vec<ChatMessage>) -> Self {
        ChatMessageHistory { messages }
    }

    /// Adds a new message to the history
    pub fn add_message(&mut self, role: Role, content: String) -> &mut Self {
        let message = ChatMessage { role, content };
        self.messages.push(message);
        self
    }

    /// Adds a system message to the history
    pub fn add_system_message(&mut self, content: String) -> &mut Self {
        self.add_message(Role::System, content)
    }

    /// Adds a user message to the history
    pub fn add_user_message(&mut self, content: String) -> &mut Self {
        self.add_message(Role::User, content)
    }

    /// Adds an assistant message to the history
    pub fn add_assistant_message(&mut self, content: String) -> &mut Self {
        self.add_message(Role::Assistant, content)
    }

    /// Gets the number of messages in the history
    pub fn len(&self) -> usize {
        self.messages.len()
    }

    /// Checks if the history is empty
    pub fn is_empty(&self) -> bool {
        self.messages.is_empty()
    }

    /// Gets a reference to the messages vector
    pub fn get_messages(&self) -> &Vec<ChatMessage> {
        &self.messages
    }

    /// Gets a mutable reference to the messages vector
    pub fn get_messages_mut(&mut self) -> &mut Vec<ChatMessage> {
        &mut self.messages
    }

    /// Gets a specific message by index
    pub fn get(&self, index: usize) -> Option<&ChatMessage> {
        self.messages.get(index)
    }

    /// Gets a mutable reference to a specific message by index
    pub fn get_mut(&mut self, index: usize) -> Option<&mut ChatMessage> {
        self.messages.get_mut(index)
    }

    /// Removes a message by index
    pub fn remove(&mut self, index: usize) -> Option<ChatMessage> {
        if index < self.messages.len() {
            Some(self.messages.remove(index))
        } else {
            None
        }
    }

    /// Clears all messages from the history
    pub fn clear(&mut self) {
        self.messages.clear();
    }

    /// Sets the entire message history
    pub fn set_messages(&mut self, messages: Vec<ChatMessage>) {
        self.messages = messages;
    }

    /// Gets the last message in the history
    pub fn last(&self) -> Option<&ChatMessage> {
        self.messages.last()
    }

    /// Gets the last message in the history as mutable
    pub fn last_mut(&mut self) -> Option<&mut ChatMessage> {
        self.messages.last_mut()
    }

    /// Gets messages of a specific role
    pub fn get_messages_by_role(&self, role: Role) -> Vec<&ChatMessage> {
        self.messages
            .iter()
            .filter(|msg| msg.role == role)
            .collect()
    }

    /// Gets the most recent message of a specific role
    pub fn get_latest_message_by_role(&self, role: Role) -> Option<&ChatMessage> {
        self.messages.iter().rev().find(|msg| msg.role == role)
    }

    /// Limits the history to the last N messages
    pub fn limit_messages(&mut self, count: usize) -> &mut Self {
        if self.messages.len() > count {
            let start_index = self.messages.len() - count;
            self.messages.drain(0..start_index);
        }
        self
    }

    /// Prepends a system message to the beginning of the history
    pub fn prepend_system_message(&mut self, content: String) -> &mut Self {
        let message = ChatMessage {
            role: Role::System,
            content,
        };
        self.messages.insert(0, message);
        self
    }

    /// Replaces the content of the last message if it has the specified role
    pub fn update_last_message(&mut self, role: Role, new_content: String) -> bool {
        if let Some(last_msg) = self.messages.last_mut() {
            if last_msg.role == role {
                last_msg.content = new_content;
                return true;
            }
        }
        false
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_history() {
        let history = ChatMessageHistory::new();
        assert!(history.is_empty());
        assert_eq!(history.len(), 0);
    }

    #[test]
    fn test_add_message() {
        let mut history = ChatMessageHistory::new();
        history.add_user_message("Hello".to_string());
        println!("{}", history.last().unwrap().role); // user / assistant
        assert_eq!(history.len(), 1);
        assert_eq!(history.get(0).unwrap().role, Role::User);
        assert_eq!(history.get(0).unwrap().content, "Hello");
    }

    #[test]
    fn test_multiple_messages() {
        let mut history = ChatMessageHistory::new();
        history
            .add_system_message("You are a helpful assistant.".to_string())
            .add_user_message("Hi".to_string())
            .add_assistant_message("Hello!".to_string());

        assert_eq!(history.len(), 3);
        assert_eq!(history.get(0).unwrap().role, Role::System);
        assert_eq!(history.get(1).unwrap().role, Role::User);
        assert_eq!(history.get(2).unwrap().role, Role::Assistant);
    }

    #[test]
    fn test_get_messages_by_role() {
        let mut history = ChatMessageHistory::new();
        history
            .add_system_message("System message".to_string())
            .add_user_message("User message".to_string())
            .add_assistant_message("Assistant message".to_string())
            .add_user_message("Another user message".to_string());

        let user_messages = history.get_messages_by_role(Role::User);
        assert_eq!(user_messages.len(), 2);

        let assistant_messages = history.get_messages_by_role(Role::Assistant);
        assert_eq!(assistant_messages.len(), 1);
    }

    #[test]
    fn test_limit_messages() {
        let mut history = ChatMessageHistory::new();
        for i in 0..10 {
            history.add_user_message(format!("Message {}", i));
        }

        assert_eq!(history.len(), 10);

        history.limit_messages(5);
        assert_eq!(history.len(), 5);

        // Check that the last 5 messages are preserved
        assert_eq!(history.get(0).unwrap().content, "Message 5");
        assert_eq!(history.get(4).unwrap().content, "Message 9");
    }

    #[test]
    fn test_prepend_system_message() {
        let mut history = ChatMessageHistory::new();
        history.add_user_message("First message".to_string());
        history.prepend_system_message("System instruction".to_string());

        assert_eq!(history.len(), 2);
        assert_eq!(history.get(0).unwrap().role, Role::System);
        assert_eq!(history.get(1).unwrap().role, Role::User);
    }

    #[test]
    fn test_update_last_message() {
        let mut history = ChatMessageHistory::new();
        history.add_assistant_message("Old response".to_string());

        let updated = history.update_last_message(Role::Assistant, "New response".to_string());
        assert!(updated);
        assert_eq!(history.last().unwrap().content, "New response");

        // Try to update last message with wrong role
        let not_updated = history.update_last_message(Role::User, "Should not update".to_string());
        assert!(!not_updated);
    }

    #[test]
    fn test_role_serialization() {
        use serde_json;

        let user_msg = ChatMessage {
            role: Role::User,
            content: "Hello".to_string(),
        };
        let json = serde_json::to_string(&user_msg).unwrap();
        assert!(json.contains("\"role\":\"user\""));

        let system_msg = ChatMessage {
            role: Role::System,
            content: "System message".to_string(),
        };
        let json = serde_json::to_string(&system_msg).unwrap();
        assert!(json.contains("\"role\":\"system\""));

        let assistant_msg = ChatMessage {
            role: Role::Assistant,
            content: "Assistant message".to_string(),
        };
        let json = serde_json::to_string(&assistant_msg).unwrap();
        assert!(json.contains("\"role\":\"assistant\""));
    }

    #[test]
    fn test_role_deserialization() {
        use serde_json;

        let json = r#"{"role":"user","content":"Hello"}"#;
        let msg: ChatMessage = serde_json::from_str(json).unwrap();
        assert_eq!(msg.role, Role::User);
        assert_eq!(msg.content, "Hello");

        let json = r#"{"role":"system","content":"System message"}"#;
        let msg: ChatMessage = serde_json::from_str(json).unwrap();
        assert_eq!(msg.role, Role::System);
        assert_eq!(msg.content, "System message");

        let json = r#"{"role":"assistant","content":"Assistant message"}"#;
        let msg: ChatMessage = serde_json::from_str(json).unwrap();
        assert_eq!(msg.role, Role::Assistant);
        assert_eq!(msg.content, "Assistant message");

        // Test that uppercase values still work with the From implementations
        assert_eq!(Role::from("user".to_string()), Role::User);
        assert_eq!(Role::from("system"), Role::System);
        assert_eq!(Role::from("assistant"), Role::Assistant);
    }
}
