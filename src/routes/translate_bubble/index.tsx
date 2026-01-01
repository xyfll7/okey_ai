import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import Copyed from "@/components/Copyed";
import { Button } from "@/components/ui/button";
import { EVENT_NAMES } from "@/lib/events";
import { AutoSpeakState, type ChatMessage } from "@/lib/types";
import { cn, speak } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { DragDropVerticalIcon, ArrowExpand01Icon, VolumeHighIcon } from "@hugeicons/core-free-icons";

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
				console.log("11111", content);
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
		const unlistenError = listen<string>(EVENT_NAMES.AI_ERROR, () => {});
		emit(EVENT_NAMES.PAGE_LOADED, { ok: true });
		return () => {
			unlistenClean.then((fn) => fn());
			unlistenSpeak.then((fn) => fn());
			unlistenResponse.then((fn) => fn());
			unlistenError.then((fn) => fn());
		};
	}, []);
	const chat = chatHistory?.at(-1);
	return (
		<div className=" h-full p-px ">
			<div
				data-tauri-drag-region
				className={cn(
					"bg-background h-full",
					"border rounded-md",
					"flex items-center justify-between",
				)}
			>
				<div
					className="flex items-center justify-start w-full min-h-full overflow-hidden"
					data-tauri-drag-region
				>
					<div
						className="flex items-center cursor-grab overflow-hidden active:cursor-grabbing"
						data-tauri-drag-region
					>
						<Button
							className={cn(
								"hover:text-current",
								"hover:bg-transparent dark:hover:bg-transparent cursor-grab ",
							)}
							size={"icon-sm"}
							variant={"ghost"}
							onClick={() => {}}
							data-tauri-drag-region
						>
							<HugeiconsIcon 
								icon={DragDropVerticalIcon}
								strokeWidth={2}
								className="cursor-grab  active:cursor-grabbing"
								data-tauri-drag-region
							/>
						</Button>
					</div>
					<div className="flex text-nowrap overflow-hidden flex-1">
						<span>{chat?.content} </span>
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
				<div className="flex items-center">
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
						onClick={() => speak(chat?.content || "")}
					>
						<HugeiconsIcon 
							icon={VolumeHighIcon}
							strokeWidth={2}
						/>
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
						<HugeiconsIcon 
							icon={ArrowExpand01Icon}
							strokeWidth={2}
						/>
					</Button>
				</div>
			</div>
		</div>
	);
}
