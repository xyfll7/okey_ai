import { EVENT_NAMES } from "@/lib/events";
import type { ChatMessage } from "@/lib/types";
import { Store } from "@tanstack/react-store";
import { Channel, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export const s_Selected = new Store({ text: "", raw: "" });
export const s_ChatList = new Store<ChatMessage[]>([]);
export const s_LoadingChat = new Store(false);
export const s_StreamingContent = new Store<string>("");

type StreamEvent =
    | { event: "chunk"; data: { content: string } }
    | { event: "done"; data?: unknown }
    | { event: "error"; data: { message: string } };

export const handleStream = async (chatMessage: ChatMessage) => {
    s_LoadingChat.setState(() => true);
    let accumulated = "";
    const channel = new Channel<StreamEvent>();
    channel.onmessage = (message) => {
        switch (message.event) {
            case "chunk": {
                accumulated += message.data?.content ?? "";
                s_StreamingContent.setState(() => accumulated);
                break;
            }
            case "error": {
                console.log("Stream error:", message.data.message);
                s_StreamingContent.setState(() => "");
                break;
            }
            case "done": {
                console.log("Stream completed successfully");
                s_StreamingContent.setState(() => "");
                break;
            }
            default:
                break;
        }
    };

    await invoke(EVENT_NAMES.chat_stream, {
        chat_message: chatMessage,
        on_event: channel,
    });
};

async function init() {
    const localeResult = await invoke<string>(EVENT_NAMES.get_locale);

    const i18n = await import("@/i18n/index");
    i18n.default.changeLanguage(localeResult);

    listen<boolean>(EVENT_NAMES.CHATTING_STATE_CHANGE, (event) => {
        console.log("CHATTING_STATE_CHANGE event received:", event.payload);
        s_LoadingChat.setState(() => event.payload);
    });

    listen<string>(EVENT_NAMES.START_CHAT_STREAM, () => {
        handleStream({ role: "user", content: "" } as ChatMessage);
    });
}
init();

