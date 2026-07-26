import { type ReactNode, useEffect } from "react"
import { chatMessagesToUIMessages } from "./chatUtils"
import { EVENT_NAMES } from "@/lib/events"
import { invoke } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"
import type { ChatMessage } from "@/lib/types"
import { useChatContext } from "@/components/chat/chatContext"
import { s_Selected } from "@/store"

export function ChatInit({ children }: { children: ReactNode }) {
	const { append, setMessages, sendMessage } = useChatContext()
	useEffect(() => {
		invoke<ChatMessage[]>(EVENT_NAMES.get_current_history).then((history) => {
			setMessages(chatMessagesToUIMessages(history))
		});
		const unlisten = getCurrentWindow().listen<{ translation_prompt: string; selected_text: string }>(EVENT_NAMES.START_CHAT_STREAM, (e) => {
			s_Selected.setState(() => ({ text: e.payload.selected_text, }));
			sendMessage(e.payload.translation_prompt)
		})
		return () => { unlisten.then((fn) => fn()) }
	}, [append, setMessages, sendMessage])

	return <>{children}</>
}
