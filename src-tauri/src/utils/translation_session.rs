use crate::states::chat_history::GlobalChatHistory;
use crate::utils::chat_message::Role;
use std::collections::HashSet;
use std::sync::Arc;
use tauri::async_runtime::RwLock;
use uuid::Uuid;

/// 翻译会话管理器 - 包装 GlobalChatHistory
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

    /// 创建新的翻译会话（打开弹窗时）
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

    /// 翻译文本（在会话中）
    pub async fn translate(
        &self,
        session_id: &str,
        text: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        // 验证会话是否活跃
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

        // 获取完整历史
        let messages = self
            .chat_history
            .get_messages(session_id)
            .await
            .ok_or("无法获取会话历史")?;

        // 构建 API 请求（这里需要你的实际实现）
        let response = self.call_ai_api(messages).await?;

        // 保存助手回复
        self.chat_history
            .add_assistant_message(session_id, response.clone())
            .await;

        Ok(response)
    }

    /// 获取会话历史
    pub async fn get_history(
        &self,
        session_id: &str,
    ) -> Option<Vec<crate::utils::chat_message::ChatMessage>> {
        self.chat_history.get_messages(session_id).await
    }

    /// 关闭会话（关闭弹窗时）
    pub async fn close_session(&self, session_id: &str) {
        let mut sessions = self.active_sessions.write().await;
        sessions.remove(session_id);
        // 历史保留在 GlobalChatHistory 中
    }

    /// 清理会话历史（释放内存）
    pub async fn cleanup_session(&self, session_id: &str) {
        self.chat_history.remove_history(session_id).await;
        let mut sessions = self.active_sessions.write().await;
        sessions.remove(session_id);
    }

    /// 获取活跃会话数量
    pub async fn active_count(&self) -> usize {
        let sessions = self.active_sessions.read().await;
        sessions.len()
    }

    /// 定期清理旧会话（后台任务）
    pub async fn cleanup_inactive_sessions(&self) {
        let active = self.active_sessions.read().await;

        // 获取 GlobalChatHistory 中的所有会话
        let state = self.chat_history.0.read().await;
        let all_keys: Vec<String> = state.histories.keys().cloned().collect();
        drop(state); // 释放读锁

        // 清理不活跃的翻译会话
        for key in all_keys {
            if key.starts_with("translate_") && !active.contains(&key) {
                self.chat_history.remove_history(&key).await;
            }
        }
    }

    // 实际的 AI API 调用（需要你根据实际情况实现）
    async fn call_ai_api(
        &self,
        messages: Vec<crate::utils::chat_message::ChatMessage>,
    ) -> Result<String, Box<dyn std::error::Error>> {
        // TODO: 实现你的 AI API 调用逻辑
        // 例如：
        // let request = ChatCompletionRequest {
        //     model: "qwen-plus".to_string(),
        //     messages,
        //     temperature: Some(0.1),
        //     max_tokens: Some(2000),
        // };
        // let response = your_api_client.chat(request).await?;

        Ok("翻译结果示例".to_string())
    }
}
