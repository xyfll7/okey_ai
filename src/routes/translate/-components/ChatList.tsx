import React from "react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@tanstack/react-store";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import Markdown from "markdown-to-jsx";
import { Button } from "@/components/ui/button";
import Copyed from "@/components/Copyed";
import { EVENT_NAMES, useInvoke } from "@/lib/events";
import { type ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { s_ChatList, s_Selected, s_StreamingContent } from "@/store";
import { useContainerSelection } from "../-hooks/useContainerSelection";

const StreamingMessage = React.memo(function StreamingMessage({ content }: { content: string }) {
	const [displayed, setDisplayed] = useState(content);
	useEffect(() => {
		const id = requestAnimationFrame(() => setDisplayed(content));
		return () => cancelAnimationFrame(id);
	}, [content]);
	return (
		<div className={cn("px-2.5 mb-2 w-full", "min-h-70")}>
			<Markdown className="mb-2">{displayed}</Markdown>
		</div>
	);
}, (prev, next) => prev.content === next.content);

const MessageItem = React.memo(function MessageItem({ chat, className, index }: { chat: ChatMessage, className?: string, index: number }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const { handleMouseEnter, handleMouseLeave, handleMouseUp } = useContainerSelection(
		containerRef,
		(text) => s_Selected.setState(() => ({ text, raw: chat.content! })),
	);

	return (
		<div
			ref={containerRef}
			role="none"
			className={cn(className, " w-full")}
			data-index={index}
			style={{ scrollMarginTop: "10rem" }}
			onMouseUp={handleMouseUp}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<div className="wrap-break-word ">
				<Markdown className="mb-2">{chat.raw ?? chat.content}</Markdown>
				<div className="flex items-center">
					<Button size={"icon-sm"} variant={"ghost"}>
						<Copyed text={chat.content} />
					</Button>
				</div>
			</div>
		</div>
	);
}, (prev, next) => prev.chat.content === next.chat.content && prev.chat.raw === next.chat.raw);

export function ChatList({ className }: { className?: string; }) {
	const chatList = useStore(s_ChatList, (state) => state.filter((e) => e.role !== "system"));
	const streamingContent = useStore(s_StreamingContent, (state) => state);
	const { ...loadingChat_X } = useInvoke<boolean>(EVENT_NAMES.get_chatting_state, false, false, undefined, EVENT_NAMES.CHATTING_STATE_CHANGE);


	useEffect(() => {
		invoke<ChatMessage[]>(EVENT_NAMES.get_current_history).then((history) => {
			s_ChatList.setState(() => history);
			s_StreamingContent.setState(() => "");
		})
		const unlistenResponse = listen<ChatMessage[]>(
			EVENT_NAMES.CHAT_HISTORY_UPDATE,
			({ payload }) => {
				const chat = payload.at(-1)?.role === "user" ? payload.at(-1) : payload.at(-2)
				if (chat?.raw && chat.role === "user") {
					s_Selected.setState(() => ({
						text: chat.raw!,
						raw: chat.content!,
					}));
				}

				s_ChatList.setState(() => payload);

				const filtered = payload.filter((e) => e.role !== "system");
				if (filtered.length > 2 && filtered.at(-1)?.role === "user") {
					const lastIndex = filtered.length - 1;
				// Wait a few more frames for the markdown/streaming content layout to stabilize before scrolling.
				// Avoid smooth scrolling from being interrupted during layout jitter and failing to scroll to the correct position.
				const runAfterFrames = (frames: number) => {
					if (frames <= 0) {
						document.querySelector(`[data-index="${lastIndex}"]`)
							?.scrollIntoView({ behavior: "smooth", block: "start" });
					} else {
						requestAnimationFrame(() => runAfterFrames(frames - 1));
					}
				};
				runAfterFrames(7);
				}
			},
		);
		const unlistenError = listen<string>(EVENT_NAMES.AI_ERROR, (event) => {
			const errorPayload: ChatMessage = {
				role: "assistant",
				content: event.payload,
			};
			s_ChatList.setState((list) => [...list, errorPayload]);
		});
		emit(EVENT_NAMES.PAGE_LOADED, { ok: true });
		return () => {
			unlistenResponse.then((fn) => fn());
			unlistenError.then((fn) => fn());
		};
	}, []);
	return (
		<div role="none" className={cn(className, "max-w-screen flex-coh")} data-chat-container>
			{chatList.map((chat, index) => {
				return (
					<MessageItem className="px-2.5 mb-2" key={`msg-${index}`} chat={chat} index={index} />
				);
			})}
			<div className={cn("px-2.5", (!streamingContent && loadingChat_X.state) ? "": "sr-only")} ><span data-loading="...">...</span></div>
			<StreamingMessage content={streamingContent} />
		</div>
	);
}
