import type { UIMessage } from "@tanstack/ai/client";

/**
 * Corresponds to the Rust struct PromptTag in src-tauri/src/states/app_config.rs
 */
export interface PromptTag {
	id?: number;
	label?: string;
	content?: string;
	raw?: string;
}

/**
 * Corresponds to the Rust struct ChatMessageHistory in src-tauri/src/utils/chat_message.rs
 */
export interface ChatMessageHistory {
	messages: UIMessage[];
}

export const AutoSpeakState = {
	Off: "off",
	Single: "single",
	All: "all",
} as const;

export type AutoSpeakState = typeof AutoSpeakState[keyof typeof AutoSpeakState];

import { m } from "@/paraglide/messages.js";

/**
 * Get localized model provider display names.
 * Uses Paraglide JS message functions.
 */
export function getModelProviderShowName() {
	return {
		"Qwen": m.model_providers_Qwen(),
		"DeepSeek": m.model_providers_DeepSeek(),
		"OpenAI": m.model_providers_OpenAI(),
		"ZAI": m.model_providers_ZAI(),
	};
}
