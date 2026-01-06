import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import Copyed from "@/components/Copyed";
import { Button } from "@/components/ui/button";
import { EVENT_NAMES } from "@/lib/events";
import { AutoSpeakState, type ChatMessage } from "@/lib/types";
import { cn, speak } from "@/lib/utils";
import { IIGripVertical, IIArrowExpand, IIVolumeHigh } from "@/components/icons";

export const Route = createFileRoute("/translate_bubble/")({
	component: RouteComponent,
});

function RouteComponent() {
	const [chatHistory, setChatHistory] = useState<ChatMessage[]>();
	useEffect(() => {
		const unlistenClean = listen<ChatMessage[]>(EVENT_NAMES.BUBBLE_CLEAN, () =>
			setChatHistory(undefined),
		);
		const unlistenSpeak = listen<ChatMessage[]>(
			EVENT_NAMES.BUBBLE_AUTO_SPEAK,
			({ payload }) => {
				const chat = payload.at(-1);
				const content = chat?.raw ?? chat?.content ?? "";
				invoke<AutoSpeakState>(EVENT_NAMES.GET_AUTO_SPEAK_STATE).then((res) => {
					const isSingleWord = content.trim().split(/\s+/).length === 1;
					if (
						(res === AutoSpeakState.Single && isSingleWord) ||
						(res === AutoSpeakState.All && content.trim().length > 0)
					) {
						speak(content);
					}
				});
			},
		);
		const unlistenResponse = listen<ChatMessage[]>(
			EVENT_NAMES.AI_RESPONSE,
			({ payload }) => {
				setChatHistory(payload);
			},
		);
		const unlistenError = listen<string>(EVENT_NAMES.AI_ERROR, () => { });
		return () => {
			unlistenClean.then((fn) => fn());
			unlistenSpeak.then((fn) => fn());
			unlistenResponse.then((fn) => fn());
			unlistenError.then((fn) => fn());
		};
	}, []);
	const chat = (() => {
		let item = chatHistory?.at(-1);
		return item?.role === "assistant" ? item : undefined
	})()
	return (
		<div className=" h-full p-px ">
			<div
				data-tauri-drag-region
				className={cn(
					"p-0.5",
					"bg-background",
					"border rounded-md",
					"flex justify-between",
				)}
			>
				<div
					className="flex items-center justify-start w-full  overflow-hidden"
					data-tauri-drag-region
				>
					<div
						className="flex overflow-hidden cursor-grab  active:cursor-grabbing"
						data-tauri-drag-region
					>
						<Button
							className={cn(
								"hover:text-current",
								"hover:bg-transparent dark:hover:bg-transparent cursor-grab ",
							)}
							size={"icon-sm"}
							variant={"ghost"}
							onClick={() => { }}
							data-tauri-drag-region
						>
							<IIGripVertical
								strokeWidth={3}
								className="cursor-grab  active:cursor-grabbing"
								data-tauri-drag-region
							/>
						</Button>
					</div>
					<div className="flex overflow-hidden text-nowrap flex-1">
						<span>{chat ? (chat?.raw ?? chat?.content) : "..."} </span>
						{chat?.content ? (
							<span
								className="truncate text-transparent selection:bg-transparent cursor-grab hover:cursor-grabbing"
								data-tauri-drag-region
							>
								.........................
							</span>
						) : (
							""
						)}
					</div>
				</div>
				<div className="flex">
					<Button
						className={cn("")}
						size={"icon-sm"}
						variant={"ghost"}
					>
						<Copyed text={chat?.content} />
					</Button>
					<Button
						className={cn("")}
						size={"icon-sm"}
						variant={"ghost"}
						onClick={() => {
							let chat_user = chatHistory?.at(-2);
							speak(chat_user?.raw ?? chat_user?.content ?? "")
						}}
					>
						<IIVolumeHigh/>
					</Button>
					<Button
						className={cn("")}
						size={"icon-sm"}
						variant={"ghost"}
						onClick={async () => {
							if (!chatHistory) return;
							await invoke(EVENT_NAMES.COMMAND_WINDOW_TRANSLATE_SHOW, {
								chat_message: chatHistory,
							});
						}}
					>
						<IIArrowExpand/>
					</Button>
				</div>
			</div>
		</div>
	);
}
