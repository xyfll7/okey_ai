
import { useEffect, } from "react"
import { invoke } from "@tauri-apps/api/core"
import { emit, listen } from "@tauri-apps/api/event"
import { useChat, type UIMessage } from "@tanstack/ai-react"
import {
	MessageCircleDashedIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty"

import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from "@/components/ui/message-scroller"

import { EVENT_NAMES, useInvoke } from "@/lib/events"
import type { ChatMessage } from "@/lib/types"
import { s_Selected, } from "@/store"
import {
	noopConnection,
	chatMessageToUIMessage,
	chatMessagesToUIMessages,
	type ChatUIMessage,
} from "./chatConnection"

function getMessageText(message: UIMessage) {
	return message.parts
		.map((part) => (part.type === "text" ? part.content : ""))
		.join("")
}



export function TanStackAiHelperDemo() {
	const { messages, append, setMessages } = useChat({
		connection: noopConnection,
		initialMessages: [],
	})

	const { ...loadingChat_X } = useInvoke<boolean>(EVENT_NAMES.get_chatting_state, false, false, undefined, EVENT_NAMES.CHATTING_STATE_CHANGE)

	useEffect(() => {
		invoke<ChatMessage[]>(EVENT_NAMES.get_current_history).then((history) => {
			setMessages(chatMessagesToUIMessages(history))
		})

		const unlistenResponse = listen<ChatMessage[]>(
			EVENT_NAMES.CHAT_HISTORY_UPDATE,
			({ payload }) => {
				const chat = payload.at(-1)?.role === "user" ? payload.at(-1) : payload.at(-2)
				if (chat?.role === "user") {
					s_Selected.setState(() => ({
						text: chat.raw!,
						raw: chat.content,
					}))
				}
				setMessages(chatMessagesToUIMessages(payload))
			},
		)

		const unlistenError = listen<string>(EVENT_NAMES.AI_ERROR, (event) => {
			const errorPayload: ChatMessage = {
				role: "assistant",
				content: event.payload,
			}
			void append(chatMessageToUIMessage(errorPayload))
		})

		emit(EVENT_NAMES.PAGE_LOADED, { ok: true })
		return () => {
			unlistenResponse.then((fn) => fn())
			unlistenError.then((fn) => fn())
		}
	}, [setMessages, append])

	const isBusy = loadingChat_X.state

	return (
		<MessageScrollerProvider autoScroll>
			<div className="flex items-center">
				<Button
					variant="default"
					disabled={isBusy}
					onClick={async () => {
						// Reset conversation
						setMessages([])
					}}
				>
					{isBusy ? "..." : "Ready"}
				</Button>
			</div>
			{messages.length === 0 ? (
				<Empty className="h-full">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<MessageCircleDashedIcon />
						</EmptyMedia>
						<EmptyTitle>Morning, shadcn!</EmptyTitle>
						<EmptyDescription>
							What are we working on today? Press send to start a new
							conversation
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<MessageScroller className="">
					<MessageScrollerViewport className="scrollbar-area">
						<MessageScrollerContent
							aria-busy={isBusy}
							className="p-4 scroll-fade"
						>
							{messages.map((message) => (
								<MessageScrollerItem key={message.id} messageId={message.id} scrollAnchor={false}>
									{getMessageText(message as ChatUIMessage)}
								</MessageScrollerItem>
							))}
							<MessageScrollerItem
								messageId="streaming"
								scrollAnchor={false}
							>

							</MessageScrollerItem>
						</MessageScrollerContent>
					</MessageScrollerViewport>
					<MessageScrollerButton className="start-1/2" />
				</MessageScroller>
			)}
		</MessageScrollerProvider>
	)
}
