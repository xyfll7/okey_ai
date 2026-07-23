import { type ReactNode } from "react"
import { useChat } from "@tanstack/ai-react"
import { createMockAdapter } from "./mockAdapter"
import { ChatContext } from "./chatContext"

export function ChatProvider({ children }: { children: ReactNode }) {

    const chat = useChat({
        initialMessages: [],
        connection: createMockAdapter(),
    })


    return (
        <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>
    )
}


