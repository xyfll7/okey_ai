// Constants for all Tauri event names used in the frontend
// This centralizes event name management to avoid typos and make refactoring easier

export const EVENT_NAMES = {
	// Event emitted when AI processing completes and response is ready
	AUTO_SPEAK: "AUTO_SPEAK",
	AI_RESPONSE: "AI_RESPONSE",

	// Event emitted when an AI processing error occurs
	AI_ERROR: "AI_ERROR",

	// Event emitted when a page has finished loading
	PAGE_LOADED: "PAGE_LOADED",

	// Event emitted when a global shortcut is pressed
	GLOBAL_SHORTCUT_PRESSED: "GLOBAL_SHORTCUT_PRESSED",
} as const;

// Type for event names to provide type safety
export type EventName = keyof typeof EVENT_NAMES;
