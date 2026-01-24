import { EVENT_NAMES } from "@/lib/events";
import type { ChatMessage } from "@/lib/types";
import { Store } from "@tanstack/react-store";
import { invoke } from "@tauri-apps/api/core";

export const s_Selected = new Store({ text: "", raw: "" });
export const s_ChatList = new Store<ChatMessage[]>([]);
export const s_CurrentModel = new Store("");




async function init() {
    const result = await invoke<string>(EVENT_NAMES.get_current_model);
    s_CurrentModel.setState(result)
}
init()