// Constants for all Tauri event names used in the frontend
// This centralizes event name management to avoid typos and make refactoring easier

export const EVENT_NAMES = {
  // from Tauri backend
  BUBBLE_AUTO_SPEAK: "BUBBLE_AUTO_SPEAK",
  BUBBLE_CLEAN: "BUBBLE_CLEAN",
  AI_RESPONSE: "AI_RESPONSE",
  AI_ERROR: "AI_ERROR",
  // to Tauri backend
  PAGE_LOADED: "PAGE_LOADED",
  // CMD events
  REGISTER_HOTKEY: "register_hotkey_okey_ai",
  TOGGLE_AUTO_CLOSE_WINDOW: "toggle_auto_close_translate",
  GET_AUTO_CLOSE_WINDOW_STATE: "get_auto_close_translate_state",
  DETECT_LANGUAGE: "detect_language",
  GET_AUTO_SPEAK_STATE: "get_auto_speak_state",
  COMMAND_WINDOW_TRANSLATE_SHOW: "command_window_translate_show",
  TOGGLE_AUTO_SPEAK: "toggle_auto_speak",
  TRANSLATE_SPECIFIED_TEXT: "translate_specified_text",
  CLOSE_MAIN_WINDOW: "close_main_window",
  GET_HISTORIES: "get_histories",
  CHAT: "chat",
  CHAT_STREAM: "chat_stream",
  CHAT_STREAM_COLLECT: "chat_stream_collect",
} as const;

// Type for event names to provide type safety
export type EventName = keyof typeof EVENT_NAMES;
