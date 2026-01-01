use crate::my_api::manager::APIManager;
use crate::my_api::traits::ChatCompletionRequest;
use crate::states::chat_histories::GlobalChatHistories;
use crate::utils::chat_message::ChatMessage;
use std::sync::Arc;
use tauri::async_runtime::RwLock;
use uuid::Uuid;

/// 翻译会话管理器
#[derive(Clone)]
pub struct TranslationManager {
    chat_histories: GlobalChatHistories,
    active_session_id: Arc<RwLock<Option<String>>>,
    api_manager: Arc<RwLock<APIManager>>,
}

impl TranslationManager {
    pub fn new(chat_histories: &GlobalChatHistories, api_manager: Arc<RwLock<APIManager>>) -> Self {
        Self {
            chat_histories: chat_histories.clone(),
            active_session_id: Arc::new(RwLock::new(None)),
            api_manager,
        }
    }

    /// 创建新的翻译会话（自动设为活跃）
    pub async fn create_session(&self) -> String {
        let session_id = format!("translate_{}", Uuid::new_v4());

        // 初始化系统提示
        self.chat_histories
            .add_system_message(
                &session_id,
                "你是一个专业的翻译助手。请准确地进行语言翻译，保持原文的含义和语气。".to_string(),
                None,
            )
            .await;

        // 设置为当前活跃会话
        let mut active_id = self.active_session_id.write().await;
        *active_id = Some(session_id.clone());

        session_id
    }

    /// 翻译文本（session_id 为可选参数，未提供时使用活跃会话）
    pub async fn translate<F>(
        &self,
        session_id: Option<&str>,
        content: &str,
        raw: Option<String>,
        callback: F,
    ) -> Option<Vec<ChatMessage>>
    where
        F: FnOnce(Vec<ChatMessage>),
    {
        // 确定要使用的会话ID
        let session_id = match session_id {
            Some(id) => id.to_string(),
            None => {
                let active_id = self.active_session_id.read().await;
                active_id.as_ref()?.clone()
            }
        };
        print!("Translating text in session  {}", content);
        // 添加用户消息
        self.chat_histories
            .add_user_message(&session_id, content.to_string(), raw)
            .await;

        // 获取历史
        let messages = self.chat_histories.get_messages(&session_id).await?;

        // 调用回调函数
        callback(messages.clone());

        // 构建 API 请求
        let request = ChatCompletionRequest {
            model: "qwen-plus".to_string(),
            messages: messages.iter().map(ChatMessage::as_llm).collect::<Vec<_>>(),
            temperature: Some(0.1),
            max_tokens: Some(500),
            top_p: Some(1.0),
            stream: None,
        };

        // 调用 AI API
        let manager = self.api_manager.read().await;
        let response = manager.chat_completion(&request).await.ok()?;

        // 提取响应内容
        let content = response.choices.first()?.message.content.clone();

        // 保存助手回复
        self.chat_histories
            .add_assistant_message(&session_id, content.clone(), None)
            .await;
        let chat_history = self.chat_histories.get_messages(&session_id).await?;
        println!(
            "Assistant response:\n {}",
            serde_json::to_string_pretty(&chat_history).unwrap()
        );
        self.chat_histories.get_messages(&session_id).await
    }

    /// 获取会话历史
    pub async fn get_history(&self, session_id: Option<&str>) -> Option<Vec<ChatMessage>> {
        // 确定要使用的会话ID
        let session_id = match session_id {
            Some(id) => id.to_string(),
            None => {
                let active_id = self.active_session_id.read().await;
                active_id.as_ref()?.clone()
            }
        };

        self.chat_histories.get_messages(&session_id).await
    }

    /// 获取当前活跃会话ID
    pub async fn get_active_session_id(&self) -> Option<String> {
        let active_id = self.active_session_id.read().await;
        active_id.clone()
    }

    /// 关闭当前活跃会话
    pub async fn close_active_session(&self) {
        let mut active_id = self.active_session_id.write().await;
        *active_id = None;
    }

    /// 清理会话（包括其历史记录）
    pub async fn cleanup_session(&self, session_id: &str) {
        self.chat_histories.remove_history(session_id).await;

        // 如果清理的是当前活跃会话，则清空活跃状态
        let mut active_id = self.active_session_id.write().await;
        if active_id.as_ref() == Some(&session_id.to_string()) {
            *active_id = None;
        }
    }

    /// 定期清理所有非活跃的翻译会话
    pub async fn cleanup_inactive_sessions(&self) {
        let active_id = self.active_session_id.read().await;
        let state = self.chat_histories.0.read().await;

        // 获取所有翻译会话的 key
        let all_keys: Vec<String> = state
            .histories
            .keys()
            .filter(|k| k.starts_with("translate_"))
            .cloned()
            .collect();
        drop(state);

        // 清理除了当前活跃会话外的所有翻译会话
        for key in all_keys {
            if let Some(active) = &*active_id {
                if key != *active {
                    self.chat_histories.remove_history(&key).await;
                }
            } else {
                // 如果没有活跃会话，清理所有翻译会话
                self.chat_histories.remove_history(&key).await;
            }
        }
    }
}
