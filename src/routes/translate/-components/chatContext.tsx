import { createContext, useContext, useEffect, useRef } from "react"
import type { useChat } from "@tanstack/ai-react"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { chatMessagesToUIMessages, chatMessageToUIMessage } from "./chatConnection"
import { EVENT_NAMES } from "@/lib/events"
import { invoke } from "@tauri-apps/api/core"
import type { ChatMessage } from "@/lib/types"

/**
 * useChat 的完整返回值类型,作为全局 Context 的共享值类型。
 * 单独抽出此模块,且本文件只导出 Context 与 hook(不导出任何 React 组件),
 * 这样在开发时热更新(HMR / Fast Refresh)`chatProvider.tsx` 或 `mockAdapter.ts`
 * 不会重新创建 ChatContext 实例,避免 provider 与 consumer 之间出现
 * "context 身份不一致" 而误报 "useChatContext must be used within a <ChatProvider>"。
 */
export type ChatContextValue = ReturnType<typeof useChat>

export const ChatContext = createContext<ChatContextValue | null>(null)

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




export function useABC() {
	const { append, setMessages } = useChatContext()
	const unlistener = useRef<UnlistenFn | null>(null)
	console.log("ChatProvider_loaded111")
	// useSyncExternalStore(() => {

	// 	return () => { console.log("我卸载了"); }
	// }, () => { });



	useEffect(() => {
		console.log("START_CHAT_STREAM__actioned---------------",)
		invoke<ChatMessage[]>(EVENT_NAMES.get_current_history).then((history) => {
			setMessages(chatMessagesToUIMessages(history))
		});
		(async () => {
			unlistener.current = await listen<string>(EVENT_NAMES.START_CHAT_STREAM, (e) => {
				console.log("START_CHAT_STREAM__actioned", e.payload)
				append(chatMessageToUIMessage({ role: "user", content: e.payload, }))
			})
		})();
		return () => { unlistener.current?.() }
	}, [append, setMessages])
}