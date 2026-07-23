import { useEffect, type ReactNode } from "react"
import { useChat } from "@tanstack/ai-react"
import { createMockAdapter } from "./mockAdapter"
import { chatMessagesToUIMessages, chatMessageToUIMessage } from "./chatConnection"
import { invoke } from "@tauri-apps/api/core"
import { EVENT_NAMES } from "@/lib/events"
import type { ChatMessage } from "@/lib/types"
import { listen } from "@tauri-apps/api/event"
import { ChatContext } from "./chatContext"

export function ChatProvider({ children }: { children: ReactNode }) {
    const chat = useChat({
        initialMessages: [],
        connection: createMockAdapter(),
    })
    const { setMessages, append, sendMessage } = chat

    useEffect(() => {
        invoke<ChatMessage[]>(EVENT_NAMES.get_current_history).then((history) => {
            setMessages(chatMessagesToUIMessages(history))
        })
        listen<string>(EVENT_NAMES.START_CHAT_STREAM, (e) => {
            append(chatMessageToUIMessage({ role: "user", content: e.payload, }))
        });
    }, [setMessages, append, sendMessage])

    return (
        <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>
    )
}
