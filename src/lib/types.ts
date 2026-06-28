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
