// Constants for all Tauri event names used in the frontend
// This centralizes event name management to avoid typos and make refactoring easier

export const EVENT_NAMES = {
	// from Tauri backend
	AUTO_SPEAK: "AUTO_SPEAK",
	AI_RESPONSE: "AI_RESPONSE",
	AI_ERROR: "AI_ERROR",
	// to Tauri backend
	PAGE_LOADED: "PAGE_LOADED",
	// CMD events
	REGISTER_HOTKEY: "register_hotkey_okey_ai",
} as const;

// Type for event names to provide type safety
export type EventName = keyof typeof EVENT_NAMES;
