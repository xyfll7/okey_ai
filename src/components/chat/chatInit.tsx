import { type ReactNode, useEffect } from "react"
import { chatMessagesToUIMessages, chatMessageToUIMessage } from "./chatConnection"
import { EVENT_NAMES } from "@/lib/events"
import { invoke } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"
import type { ChatMessage } from "@/lib/types"
import { useChatContext } from "@/components/chat/chatContext"

export function ChatInit({ children }: { children: ReactNode }) {
	const { append, setMessages } = useChatContext()
	useEffect(() => {
		invoke<ChatMessage[]>(EVENT_NAMES.get_current_history).then((history) => {
			setMessages(chatMessagesToUIMessages(history))
		});
		const unlisten = getCurrentWindow().listen<string>(EVENT_NAMES.START_CHAT_STREAM, (e) => {
			append(chatMessageToUIMessage({ role: "user", content: e.payload, }))
		})
		return () => { unlisten.then((fn)=> fn()) }
	}, [append, setMessages])

	return <>{children}</>
}
