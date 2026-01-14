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

  toggle_auto_close_translate: "toggle_auto_close_translate",
  get_auto_close_translate_state: "get_auto_close_translate_state",
  toggle_auto_speak: "toggle_auto_speak",
  get_auto_speak_state: "get_auto_speak_state",
  command_window_translate_show: "command_window_translate_show",
  close_main_window: "close_main_window",
  chat_stream: "chat_stream",
  detect_language: "detect_language",
  get_histories: "get_histories",
  register_hotkey_okey_ai: "register_hotkey_okey_ai",
  switch_model: "switch_model",
  get_current_model: "get_current_model",
  list_models: "list_models",
} as const;

// Type for event names to provide type safety
export type EventName = keyof typeof EVENT_NAMES;
