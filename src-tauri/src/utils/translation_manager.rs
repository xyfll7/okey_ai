use crate::states::chat_history::GlobalChatHistory;
use crate::utils::chat_message::{ChatMessage, Role};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::Arc;
use tauri::async_runtime::RwLock;
use uuid::Uuid;

/// 翻译会话管理器
#[derive(Clone)]
pub struct TranslationManager {
    chat_history: Arc<GlobalChatHistory>,
    active_sessions: Arc<RwLock<HashSet<String>>>,
}

impl TranslationManager {
    pub fn new(chat_history: Arc<GlobalChatHistory>) -> Self {
        Self {
            chat_history,
            active_sessions: Arc::new(RwLock::new(HashSet::new())),
        }
    }

    /// 创建新的翻译会话
    pub async fn create_session(&self) -> String {
        let session_id = format!("translate_{}", Uuid::new_v4());

        // 初始化系统提示
        self.chat_history
            .add_system_message(
                &session_id,
                "你是一个专业的翻译助手。请准确地进行语言翻译，保持原文的含义和语气。\
                 用户可能会要求你调整翻译风格、纠正翻译或重新翻译，请根据上下文理解用户意图。"
                    .to_string(),
            )
            .await;

        // 记录为活跃会话
        let mut sessions = self.active_sessions.write().await;
        sessions.insert(session_id.clone());

        session_id
    }

    /// 翻译文本
    pub async fn translate(
        &self,
        session_id: &str,
        text: &str,
    ) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        // 验证会话
        {
            let sessions = self.active_sessions.read().await;
            if !sessions.contains(session_id) {
                return Err("会话不存在或已关闭".into());
            }
        }

        // 添加用户消息
        self.chat_history
            .add_user_message(session_id, text.to_string())
            .await;

        // 获取历史
        let messages = self
            .chat_history
            .get_messages(session_id)
            .await
            .ok_or("无法获取会话历史")?;

        // TODO: 这里调用你的 AI API
        // 临时返回示例，你需要替换为实际的 API 调用
        let response = format!("翻译结果: {}", text);

        // 保存助手回复
        self.chat_history
            .add_assistant_message(session_id, response.clone())
            .await;

        Ok(response)
    }

    /// 获取会话历史
    pub async fn get_history(&self, session_id: &str) -> Option<Vec<ChatMessage>> {
        self.chat_history.get_messages(session_id).await
    }

    /// 关闭会话
    pub async fn close_session(&self, session_id: &str) {
        let mut sessions = self.active_sessions.write().await;
        sessions.remove(session_id);
    }

    /// 清理会话
    pub async fn cleanup_session(&self, session_id: &str) {
        self.chat_history.remove_history(session_id).await;
        let mut sessions = self.active_sessions.write().await;
        sessions.remove(session_id);
    }

    /// 定期清理不活跃的会话
    pub async fn cleanup_inactive_sessions(&self) {
        let active = self.active_sessions.read().await;
        let state = self.chat_history.0.read().await;
        let all_keys: Vec<String> = state.histories.keys().cloned().collect();
        drop(state);

        for key in all_keys {
            if key.starts_with("translate_") && !active.contains(&key) {
                self.chat_history.remove_history(&key).await;
            }
        }
    }
}
