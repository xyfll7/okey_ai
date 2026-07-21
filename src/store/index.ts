import { EVENT_NAMES } from "@/lib/events";
import type { ChatMessage } from "@/lib/types";

import { Store } from "@tanstack/react-store";
import { invoke } from "@tauri-apps/api/core";

export const s_Selected = new Store({ text: "", raw: "" });
export const s_ChatList = new Store<ChatMessage[]>([]);
export const s_StreamingContent = new Store<string>("");



import { setLocale } from "@/paraglide/runtime.js";

async function init() {
	const localeResult = await invoke<string>(EVENT_NAMES.get_locale);

	setLocale(localeResult as "en" | "zh-CN");
}
init();

