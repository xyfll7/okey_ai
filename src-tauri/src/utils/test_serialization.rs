use crate::utils::chat_message::{ChatMessage, ChatMessageHistory, Role};
use serde_json;

fn main() {
    // Create a chat message history with a user message
    let mut history = ChatMessageHistory::new();
    history.add_user_message("Hello".to_string());
    
    // Print the debug representation (this is what was causing confusion)
    println!("Debug representation: {:?}", history);
    
    // Print the serialized JSON representation (this is what matters for API communication)
    let json = serde_json::to_string(&history).unwrap();
    println!("JSON representation: {}", json);
    
    // Show individual message serialization
    let message = ChatMessage {
        role: Role::User,
        content: "Hello".to_string(),
    };
    let msg_json = serde_json::to_string(&message).unwrap();
    println!("Single message JSON: {}", msg_json);
}