import type { ChatMessage } from "@/lib/types";
import { Store } from "@tanstack/react-store";

export const s_Selected = new Store({ text: "", raw: "" });
export const s_ChatList = new Store<ChatMessage[]>([]);