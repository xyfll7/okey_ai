/**
 * TypeScript interface definition for ChatMessage
 * Corresponds to the Rust struct in src-tauri/src/types.rs
 */
export interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
	raw?: string;
}

export const AutoSpeakState = {
	Off: "off",
	Single: "single",
	All: "all",
} as const;

export type AutoSpeakState = typeof AutoSpeakState[keyof typeof AutoSpeakState];
