use crate::my_api::provider::{preset_for, resolve_base_url, ProviderPreset};
use crate::my_api::traits::{APIConfig, ChatCompletionChunk, ChatCompletionRequest, ChatMessageDelta, ChoiceDelta};
use crate::states::app_config::ModelProvider;
use crate::utils::chat_message::Role;
use futures::channel::oneshot;
use futures::future::{select, Either};
use futures::StreamExt;
use rig::client::CompletionClient;
use rig::completion::{AssistantContent, CompletionRequestBuilder, Message};
use rig::providers::openai;
use rig::OneOrMany;
use rig::streaming::StreamedAssistantContent;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::async_runtime::RwLock;

/// A single OpenAI-compatible provider connection.
///
/// Every provider in this app is OpenAI-compatible, so they are all served by
/// rig's `openai::CompletionsClient` — the `OpenAICompletionsExt` (chat
/// completions) backend. We deliberately do **not** use the default
/// `openai::Client`, whose `OpenAIResponsesExt` backend routes completions to
/// `/responses` and 404s on these providers. Using `CompletionsClient` keeps us
/// on `/chat/completions`.
///
/// `config` is the single source of truth for model/key/base_url; `preset`
/// holds the provider-specific quirks (path suffix + request params, see
/// [`preset_for`]).
pub struct ProviderClient {
    client: openai::CompletionsClient,
    config: APIConfig,
    preset: ProviderPreset,
}

impl ProviderClient {
    fn new(provider: &ModelProvider, config: &APIConfig) -> Result<Self, String> {
        let preset = preset_for(provider);
        let effective_base_url = resolve_base_url(&config.base_url, &preset);

        let client = openai::CompletionsClient::builder()
            .api_key(config.api_key.clone())
            .base_url(effective_base_url)
            .build()
            .map_err(|e| format!("Failed to build OpenAI-compatible client for {:?}: {}", provider, e))?;

        Ok(Self {
            client,
            config: config.clone(),
            preset,
        })
    }
}

/// Owns one [`ProviderClient`] per [`ModelProvider`] plus a single-flight
/// cancellation slot for the currently in-flight stream.
///
/// The app drives one active translation at a time, so a single cancellation
/// slot is sufficient. (Per-session cancellation would require a session-scoped
/// token passed into [`APIManager::chat_completion_stream`].)
pub struct APIManager {
    clients: Arc<RwLock<HashMap<ModelProvider, ProviderClient>>>,
    cancel_sender: Arc<Mutex<Option<oneshot::Sender<()>>>>,
}

/// Tauri-managed handle to the [`APIManager`]: an `Arc<RwLock<APIManager>>`
/// so it can be shared with
/// [`crate::utils::translation_manager::TranslationManager`] and refreshed from
/// config without re-managing the state.
pub type GlobalAPIManager = Arc<RwLock<APIManager>>;

impl APIManager {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(RwLock::new(HashMap::new())),
            cancel_sender: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn chat_completion_stream<F>(
        &self,
        request: &ChatCompletionRequest,
        model_type: &ModelProvider,
        mut callback: F,
    ) -> Result<(), String>
    where
        F: FnMut(ChatCompletionChunk) + Send,
    {
        // Resolve the model + params + base url under a short read lock, then
        // release it before the (potentially long) streaming loop.
        let (model, params, model_id, base_url) = {
            let clients = self.clients.read().await;
            let client = clients
                .get(model_type)
                .ok_or_else(|| format!("No client configured for model: {:?}", model_type))?;
            let model_id = client.config.model.clone();
            (
                client.client.completion_model(model_id.clone()),
                client.preset.extra_params.clone(),
                model_id,
                resolve_base_url(&client.config.base_url, &client.preset),
            )
        };

        let (preamble, history, prompt) = split_messages(request)?;

        let mut builder = CompletionRequestBuilder::new(model, prompt)
            .temperature(request.temperature.unwrap_or(0.1) as f64)
            .max_tokens(request.max_tokens.unwrap_or(5000) as u64)
            .additional_params(params);
        if let Some(sys) = preamble {
            builder = builder.preamble(sys);
        }
        if !history.is_empty() {
            builder = builder.messages(history);
        }

        // Honest diagnostics: this is exactly the URL rig will POST to.
        log::info!(
            "[my_api::manager] chat_completion_stream -> POST {}/chat/completions (model: {})",
            base_url,
            model_id
        );

        let mut stream = builder
            .stream()
            .await
            .map_err(|e| format!("Failed to start stream: {}", e))?;

        // Register the cancel sender so `abort_chat_stream` can interrupt us.
        let (cancel_tx, mut cancel_rx) = oneshot::channel::<()>();
        *self.cancel_sender.lock().unwrap() = Some(cancel_tx);

        loop {
            match select(stream.next(), &mut cancel_rx).await {
                Either::Left((chunk_result, _)) => match chunk_result {
                    Some(Ok(item)) => match item {
                        StreamedAssistantContent::Text(text) => {
                            let chunk = ChatCompletionChunk {
                                id: String::new(),
                                object: "chat.completion.chunk".to_string(),
                                created: 0,
                                model: model_id.clone(),
                                choices: vec![ChoiceDelta {
                                    index: 0,
                                    delta: ChatMessageDelta {
                                        role: None,
                                        content: Some(text.text),
                                    },
                                    finish_reason: None,
                                }],
                            };
                            callback(chunk);
                        }
                        StreamedAssistantContent::Final(_) => break,
                        _ => {}
                    },
                    Some(Err(e)) => {
                        *self.cancel_sender.lock().unwrap() = None;
                        return Err(format!("Stream error: {}", e));
                    }
                    None => break,
                },
                Either::Right((_, _)) => {
                    stream.cancel();
                    break;
                }
            }
        }

        *self.cancel_sender.lock().unwrap() = None;
        Ok(())
    }

    pub async fn abort_chat_stream(&self) -> Result<(), String> {
        if let Some(sender) = self.cancel_sender.lock().unwrap().take() {
            let _ = sender.send(());
        }
        Ok(())
    }

    /// (Re)build all provider clients from the current persisted configs.
    pub async fn initialize_default_clients(&self, configs: HashMap<ModelProvider, APIConfig>) {
        let mut clients = self.clients.write().await;
        clients.clear();
        for (model_type, config) in configs {
            match ProviderClient::new(&model_type, &config) {
                Ok(client) => {
                    clients.insert(model_type, client);
                }
                Err(e) => {
                    log::error!(
                        "[my_api::manager] Failed to build client for {:?}: {}",
                        model_type,
                        e
                    );
                }
            }
        }
    }
}

/// Split app messages into `(system preamble, history, final prompt)`.
///
/// The last message is always the current user turn; everything before it is
/// history. This is a pure mapping with no I/O, so it is trivially testable and
/// kept separate from the streaming logic.
fn split_messages(
    request: &ChatCompletionRequest,
) -> Result<(Option<String>, Vec<Message>, Message), String> {
    let messages = &request.messages;
    if messages.is_empty() {
        return Err("chat_completion_stream: empty messages".to_string());
    }

    let mut preamble = None;
    let mut history = Vec::new();
    for m in &messages[..messages.len() - 1] {
        match m.role {
            Role::System => preamble = Some(m.content.clone()),
            Role::User => history.push(Message::user(m.content.clone())),
            Role::Assistant => history.push(Message::Assistant {
                id: None,
                content: OneOrMany::one(AssistantContent::text(m.content.clone())),
            }),
        }
    }

    let last = &messages[messages.len() - 1];
    let prompt = match last.role {
        Role::User => Message::user(last.content.clone()),
        Role::Assistant => Message::Assistant {
            id: None,
            content: OneOrMany::one(AssistantContent::text(last.content.clone())),
        },
        Role::System => Message::user(last.content.clone()),
    };

    Ok((preamble, history, prompt))
}
