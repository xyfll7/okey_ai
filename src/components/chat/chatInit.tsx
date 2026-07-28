import { type ReactNode, useEffect } from "react"
import { EVENT_NAMES } from "@/lib/events"
import { invoke } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { AutoSpeakState } from "@/lib/types"
import { useChatContext } from "@/components/chat/chatContext"
import { s_Selected } from "@/store"
import { speak } from "@/lib/utils"
import type { UIMessage } from "@tanstack/ai-react"
import { extractLastUserTurn } from "./chatAdapter"

function maybeAutoSpeak(selectedText: string) {
	invoke<AutoSpeakState>(EVENT_NAMES.get_auto_speak_state).then((res) => {
		const isSingleWord = selectedText.trim().split(/\s+/).length === 1;
		if (
			(res === AutoSpeakState.Single && isSingleWord) ||
			(res === AutoSpeakState.All && selectedText.trim().length > 0)
		) {
			speak(selectedText);
		}
	});
}

export function ChatInit({ children }: { children: ReactNode }) {
	const { append, setMessages, sendMessage } = useChatContext()
	useEffect(() => {
		invoke<UIMessage[]>(EVENT_NAMES.get_current_history).then((history) => {
			s_Selected.setState(() => ({ text: extractLastUserTurn(history).raw  }));
			setMessages(history)
		});
		const unlisten = getCurrentWindow().listen<{ translation_prompt: string; selected_text: string }>(
			EVENT_NAMES.START_CHAT_STREAM,
			(e) => {
				maybeAutoSpeak(e.payload.selected_text);

				s_Selected.setState(() => ({ text: e.payload.selected_text, }));
				sendMessage({
					content: [
						{ type: 'text', content: e.payload.selected_text },
						{ type: 'text', content: e.payload.translation_prompt },
					],
				})
			})
		return () => { unlisten.then((fn) => fn()) }
	}, [append, setMessages, sendMessage])

	return <>{children}</>
}
