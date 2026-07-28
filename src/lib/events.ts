// Constants for all Tauri event names used in the frontend
// This centralizes event name management to avoid typos and make refactoring easier

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { useStore, Store } from "@tanstack/react-store";

// 缓存 Store 实例，避免为同一个事件创建多个 Store
const storeCache = new Map<string, Store<unknown>>();

export const EVENT_NAMES = {
  // to backend
  PAGE_LOADED: "PAGE_LOADED",
  // from backend
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
  get_language_options: "get_language_options",
  get_local_language: "get_local_language",
  set_local_language: "set_local_language",
  get_target_language: "get_target_language",
  set_target_language: "set_target_language",
  get_self_explaining_model: "get_self_explaining_model",
  set_self_explaining_model: "set_self_explaining_model",
  get_prompt_tags: "get_prompt_tags",
  delete_prompt_tag: "delete_prompt_tag",
  add_prompt_tag: "add_prompt_tag",
  update_prompt_tag: "update_prompt_tag",
  get_locale: "get_locale",
  set_locale: "set_locale",
  set_current_session: "set_current_session",
  create_new_session: "create_new_session",
  get_chatting_state: "get_chatting_state",
  assemble_prompt: "assemble_prompt",
} as const;

// Type for event names to provide type safety
export type EventName = keyof typeof EVENT_NAMES;

interface UseInvokeReturn<T> {
  store: Store<T>;
  state: T;
  setState: (value: T | ((prev: T) => T), autoRefresh?: boolean) => Promise<void>;
  invokeState: () => Promise<void>;
}

/**
 * Store-driven hook that shares state across components
 * @param event_name - The Tauri event to invoke
 * @param init - Initial value or function to generate initial value
 * @param autoSync - Auto call invokeState after setState (default: false)
 * @returns Object with store, state, setState, and invokeState
 * 
 * Usage in component:
 * const { ...model_X } = useInvoke<string>(EVENT_NAMES.get_current_model, "");
 * model_X.state // get current value
 * model_X.setState(...) // update value
 * model_X.setState(..., true) // update and auto refresh from backend
 * model_X.invokeState() // re-invoke
 *
 * onStateChange optional callback: useInvoke(event, init, false, (value) => { ... })
 */
export function useInvoke<T = undefined>(
  event_name: string,
  init: T | (() => T),
  autoSync = false,
  onStateChange?: (value: T) => void,
  listenEvent?: string,
): UseInvokeReturn<T> {
  // 如果 Store 不存在，创建一个
  if (!storeCache.has(event_name)) {
    const initialValue = typeof init === "function" ? (init as () => T)() : init;
    storeCache.set(event_name, new Store<T>(initialValue) as Store<unknown>);
  }

  const store = storeCache.get(event_name)! as Store<T>;
  // 使用 useStore hook 获取响应式状态
  const state = useStore(store, (s) => s);

  // 在组件挂载时，调用 invoke 拉取初值；若提供 listenEvent，则同时订阅后端推送
  useEffect(() => {
    let mounted = true;
    let unlistenFn: (() => void) | undefined;

    const subscription = onStateChange
      ? store.subscribe((value) => {
          onStateChange(value);
        })
      : undefined;

    (async () => {
      const result = await invoke<T>(event_name);
      if (!mounted) return;
      store.setState(() => result);
    })();

    if (listenEvent) {
      (async () => {
        const unlisten = await listen<T>(listenEvent, (event) => {
          if (!mounted) return;
          store.setState(() => event.payload);
        });
        if (!mounted) {
          unlisten();
          return;
        }
        unlistenFn = unlisten;
      })();
    }

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      unlistenFn?.();
    };
  }, [event_name, store, onStateChange, listenEvent]);

  // 提供 invokeState 方法供手动重新调用
  const invokeState = async () => {
    const result = await invoke<T>(event_name);
    store.setState(() => result);
  };

  // 返回兼容对象：既有 state/setState，又有 store 实例
  return {
    store,
    state,
    setState: async (value, shouldRefresh = autoSync) => {
      store.setState(() => (typeof value === "function" ? (value as (prev: T) => T)(state) : value));
      if (shouldRefresh) {
        await invokeState();
      }
    },
    invokeState,
  };
}

