import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, } from "react";
import Copyed from "@/components/Copyed";
import { Button } from "@/components/ui/button";
import { EVENT_NAMES } from "@/lib/events";
import { type as ostype } from "@tauri-apps/plugin-os";
import { cn, speak } from "@/lib/utils";
import { Icons } from "@/components/icon";
import { useChatContext } from "@/components/chat/chatContext";
import { getMessageText } from "@/components/chat/chatUtils";
export const Route = createFileRoute("/translate_bubble/")({
	component: RouteComponent,
});
function RouteComponent() {
	const { messages, isLoading } = useChatContext()
	const chat = (() => {
		const item = messages?.at(-1);
		return item?.role === "assistant" ? item : undefined
	})()
	useEffect(() => {
		const unlistenError = listen<string>(EVENT_NAMES.AI_ERROR, () => { });
		return () => {
			unlistenError.then((fn) => fn());
		};
	}, []);

	const _ostype = ostype();
	return (
		<div
			data-tauri-drag-region
			className={cn(
				"h-full",
				"p-0.5",
				"bg-background",
				"flex justify-between items-center",
				{ "border rounded-md": ["macos"].includes(_ostype) }
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
							"active:translate-y-0!",
						)}
						size={"icon-sm"}
						variant={"ghost"}
						onClick={() => { }}
						data-tauri-drag-region
					>
						<Icons.gripVertical
							strokeWidth={3}
							className="cursor-grab  active:cursor-grabbing"
							data-tauri-drag-region
						/>
					</Button>
				</div>
				<div className="flex overflow-hidden text-nowrap flex-1">
					{isLoading ? (
						<span data-loading="..."> "..."</span>
					) : (
						<>
							<div>{chat && getMessageText(chat)}</div>
							{chat && getMessageText(chat) ? (
								<span
									className="truncate text-transparent selection:bg-transparent cursor-grab hover:cursor-grabbing"
									data-tauri-drag-region
								>
									.........................
								</span>
							) : (
								""
							)}
						</>
					)}
				</div>
			</div>
			<div className="flex">
				<Button
					className={cn("")}
					size={"icon-sm"}
					variant={"ghost"}
				>
					<Copyed text={chat ? getMessageText(chat) : ""} />
				</Button>
				<Button
					className={cn("")}
					size={"icon-sm"}
					variant={"ghost"}
					onClick={() => {
						const chat_user = messages?.at(-2);
						if (chat_user) speak(getMessageText(chat_user))
					}}
				>
					<Icons.volumeHigh />
				</Button>
				<Button
					className={cn("")}
					size={"icon-sm"}
					variant={"ghost"}
					onClick={async () => {
						if (!messages) return;
						await invoke(EVENT_NAMES.window_translate_show, {
							chat_message: messages,
						});
					}}
				>
					<Icons.arrowExpand />
				</Button>
			</div>
		</div>
	);
}
