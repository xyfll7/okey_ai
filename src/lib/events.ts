// Constants for all Tauri event names used in the frontend
// This centralizes event name management to avoid typos and make refactoring easier

import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

export const EVENT_NAMES = {
  // to backend
  PAGE_LOADED: "PAGE_LOADED",
  // from backend
  BUBBLE_AUTO_SPEAK: "BUBBLE_AUTO_SPEAK",
  BUBBLE_CLEAN: "BUBBLE_CLEAN",
  AI_RESPONSE: "AI_RESPONSE",
  AI_ERROR: "AI_ERROR",

  START_CHAT_STREAM: "START_CHAT_STREAM",
  TRANSLATE_HIDE: "TRANSLATE_HIDE",
  CHATTING_STATE_CHANGE: "CHATTING_STATE_CHANGE",

  is_pin_translate_window_toggle: "is_pin_translate_window_toggle",
  is_pin_translate_window_get: "is_pin_translate_window_get",
  toggle_auto_speak: "toggle_auto_speak",
  get_auto_speak_state: "get_auto_speak_state",
  window_translate_show: "window_translate_show",
  close_main_window: "close_main_window",
  chat_stream: "chat_stream",
  abort_chat_stream: "abort_chat_stream",
  detect_language: "detect_language",
  get_histories: "get_histories",
  get_current_history: "get_current_history",
  register_hotkey_okey_ai: "register_hotkey_okey_ai",
  switch_model: "switch_model",
  get_current_model: "get_current_model",
  list_available_models: "list_available_models",
  update_model_api_key: "update_model_api_key",
  get_locale: "get_locale",
  set_locale: "set_locale",
  set_current_session: "set_current_session",
} as const;

// Type for event names to provide type safety
export type EventName = keyof typeof EVENT_NAMES;


export function useInvoke<T = undefined>(event_name: string, init: T | (() => T)) {
  const [state, setState] = useState<T>(init);
  const invokeState = useCallback(async () => {
    const result = await invoke<T>(event_name);
    setState(result);
  }, [event_name]);
  useEffect(() => {
    (async () => {
      const result = await invoke<T>(event_name);
      setState(result);
    })()
  }, [event_name]);
  return { state, setState, invokeState };
}
