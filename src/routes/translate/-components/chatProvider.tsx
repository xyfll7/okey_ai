import { createContext, useContext, useEffect, type ReactNode } from "react"
import { useChat } from "@tanstack/ai-react"
import { createMockAdapter } from "./mockAdapter"
import { chatMessagesToUIMessages } from "./chatConnection"
import { invoke } from "@tauri-apps/api/core"
import { EVENT_NAMES } from "@/lib/events"
import type { ChatMessage } from "@/lib/types"
import { listen } from "@tauri-apps/api/event"

/** useChat 的完整返回值类型,作为全局 Context 的共享值类型 */
type ChatContextValue = ReturnType<typeof useChat>

const ChatContext = createContext<ChatContextValue | null>(null)

/**
 * 全局聊天 Provider:在翻译路由顶层调用一次 useChat,并把历史记录加载逻辑
 * 收拢到这里,保证路由内所有组件共享同一份会话状态(messages / status 等)。
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

/**
 * 任意组件调用此 hook 即可使用全局的 useChat 方法(messages / append / status /
 * setMessages / sendMessage 等)。必须在 <ChatProvider> 内部使用。
 */
export function useChatContext() {
    const ctx = useContext(ChatContext)
    if (!ctx) {
        throw new Error("useChatContext must be used within a <ChatProvider>")
    }
    return ctx
}
