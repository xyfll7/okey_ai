use crate::my_api::manager::APIManager;
use crate::my_api::traits::ChatCompletionRequest;
use crate::states::chat_histories::GlobalChatHistories;
use crate::utils::chat_message::ChatMessage;
use std::collections::HashSet;
use std::sync::Arc;
use tauri::async_runtime::RwLock;
use uuid::Uuid;

/// 翻译会话管理器
#[derive(Clone)]
pub struct TranslationManager {
    chat_histories: GlobalChatHistories,
    active_sessions: Arc<RwLock<HashSet<String>>>,
    api_manager: Arc<RwLock<APIManager>>,
}

impl TranslationManager {
    pub fn new(chat_histories: &GlobalChatHistories, api_manager: Arc<RwLock<APIManager>>) -> Self {
        Self {
            chat_histories: chat_histories.clone(),
            active_sessions: Arc::new(RwLock::new(HashSet::new())),
            api_manager,
        }
    }

    /// 创建新的翻译会话
    pub async fn create_session(&self) -> String {
        let session_id = format!("translate_{}", Uuid::new_v4());

        // 初始化系统提示
        self.chat_histories
            .add_system_message(
                &session_id,
                "你是一个专业的翻译助手。请准确地进行语言翻译，保持原文的含义和语气。".to_string(),
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
        self.chat_histories
            .add_user_message(session_id, text.to_string())
            .await;

        // 获取历史
        let messages = self
            .chat_histories
            .get_messages(session_id)
            .await
            .ok_or("无法获取会话历史")?;

        // 构建 API 请求
        let request = ChatCompletionRequest {
            model: "qwen-plus".to_string(),
            messages: messages,
            temperature: Some(0.1),
            max_tokens: Some(500),
            top_p: Some(1.0),
            stream: None,
        };
        println!("request: {:?}", request);

        // 调用 AI API
        let manager = self.api_manager.read().await;
        let response = manager
            .chat_completion(&request)
            .await
            .map_err(|e| format!("API 调用失败: {}", e))?;

        // 提取响应内容
        let content = response
            .choices
            .first()
            .ok_or("响应中没有选择项")?
            .message
            .content
            .clone();

        // 保存助手回复
        self.chat_histories
            .add_assistant_message(session_id, content.clone())
            .await;

        Ok(content)
    }

    /// 获取会话历史
    pub async fn get_history(&self, session_id: &str) -> Option<Vec<ChatMessage>> {
        self.chat_histories.get_messages(session_id).await
    }

    /// 关闭会话
    pub async fn close_session(&self, session_id: &str) {
        let mut sessions = self.active_sessions.write().await;
        sessions.remove(session_id);
    }

    /// 清理会话
    pub async fn cleanup_session(&self, session_id: &str) {
        self.chat_histories.remove_history(session_id).await;
        let mut sessions = self.active_sessions.write().await;
        sessions.remove(session_id);
    }

    /// 定期清理不活跃的会话
    pub async fn cleanup_inactive_sessions(&self) {
        let active = self.active_sessions.read().await;
        let state = self.chat_histories.0.read().await;
        let all_keys: Vec<String> = state.histories.keys().cloned().collect();
        drop(state);

        for key in all_keys {
            if key.starts_with("translate_") && !active.contains(&key) {
                self.chat_histories.remove_history(&key).await;
            }
        }
    }
}
