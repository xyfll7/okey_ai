/**
 * TypeScript interface definition for ChatMessage
 * Corresponds to the Rust struct in src-tauri/src/types.rs
 */
export interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
	raw?: string;
}

export interface ChatMessageHistory {
	messages: ChatMessage[];
}

export const AutoSpeakState = {
	Off: "off",
	Single: "single",
	All: "all",
} as const;

export type AutoSpeakState = typeof AutoSpeakState[keyof typeof AutoSpeakState];

/**
 * Get localized model provider display names.
 * Use this function with the translation hook: const { t } = useTranslation();
 * Then call: getModelProviderShowName(t)
 */
export function getModelProviderShowName(t: { (key: "model_providers.Qwen" | "model_providers.DeepSeek" | "model_providers.OpenAI" | "model_providers.ZAI"): string; (key: string): string }) {
	return {
		"Qwen": t("model_providers.Qwen"),
		"DeepSeek": t("model_providers.DeepSeek"),
		"OpenAI": t("model_providers.OpenAI"),
		"ZAI": t("model_providers.ZAI"),
	};
}
