import { createContext, useContext, useEffect, type ReactNode } from "react"
import type { useChat } from "@tanstack/ai-react"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { chatMessagesToUIMessages, chatMessageToUIMessage } from "./chatConnection"
import { EVENT_NAMES } from "@/lib/events"
import { invoke } from "@tauri-apps/api/core"
import type { ChatMessage } from "@/lib/types"

export type ChatContextValue = ReturnType<typeof useChat>

export const ChatContext = createContext<ChatContextValue | null>(null)

export function useChatContext() {
	const ctx = useContext(ChatContext)
	if (!ctx) {
		throw new Error("useChatContext must be used within a <ChatProvider>")
	}
	return ctx
}




export function ChatInit({ children }: { children: ReactNode }) {
	const { append, setMessages } = useChatContext()
	useEffect(() => {
		invoke<ChatMessage[]>(EVENT_NAMES.get_current_history).then((history) => {
			setMessages(chatMessagesToUIMessages(history))
		});
		let un: UnlistenFn | null = null;
		listen<string>(EVENT_NAMES.START_CHAT_STREAM, (e) => {
			console.log("START_CHAT_STREAM__actioned", e.payload)
			append(chatMessageToUIMessage({ role: "user", content: e.payload, }))
		}).then((fn)=> un = fn)
		return () => { un?.() }
	}, [append, setMessages])

	return <>{children}</>
}