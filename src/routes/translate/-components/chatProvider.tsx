import { useEffect, type ReactNode } from "react"
import { useChat } from "@tanstack/ai-react"
import { createMockAdapter } from "./mockAdapter"
import { chatMessagesToUIMessages } from "./chatConnection"
import { invoke } from "@tauri-apps/api/core"
import { EVENT_NAMES } from "@/lib/events"
import type { ChatMessage } from "@/lib/types"
import { listen } from "@tauri-apps/api/event"
import { ChatContext } from "./chatContext"

/**
 * 全局聊天 Provider:在翻译路由顶层调用一次 useChat,并把历史记录加载逻辑
 * 收拢到这里,保证路由内所有组件共享同一份会话状态(messages / status 等)。
 * (Context 与 useChatContext 抽到 ./chatContext.tsx,本文件只负责"提供"值。)
 */
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
            sendMessage(e.payload)
        });
    }, [setMessages, append, sendMessage])

    return (
        <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>
    )
}
