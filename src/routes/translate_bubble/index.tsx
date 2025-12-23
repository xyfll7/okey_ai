import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { GripVertical, Maximize2, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import Copyed from "@/components/Copyed";
import { Button } from "@/components/ui/button";
import { EVENT_NAMES } from "@/lib/events";
import { AutoSpeakState, type InputData } from "@/lib/types";
import { cn, speak } from "@/lib/utils";

export const Route = createFileRoute("/translate_bubble/")({
	component: RouteComponent,
});

function RouteComponent() {
	const [chat, setChat] = useState<InputData>();
	useEffect(() => {
		const unlistenSpeak = listen<InputData>(
			EVENT_NAMES.AUTO_SPEAK_BUBBLE,
			({ payload }) => {
				invoke<AutoSpeakState>(EVENT_NAMES.GET_AUTO_SPEAK_STATE).then((res) => {
					const isSingleWord =
						payload.input_text.trim().split(/\s+/).length === 1;
					if (
						(res === AutoSpeakState.Single && isSingleWord) ||
						(res === AutoSpeakState.All && payload.input_text.trim().length > 0)
					) {
						console.log(
							"Auto speaking from translate bubble:",
							payload.input_text,
						);
						speak(payload.input_text);
						setChat(payload);
					}
				});
			},
		);
		const unlistenResponse = listen<InputData>(
			EVENT_NAMES.AI_RESPONSE,
			({ payload }) => setChat(payload),
		);
		const unlistenError = listen<string>(EVENT_NAMES.AI_ERROR, () => {});
		emit(EVENT_NAMES.PAGE_LOADED, { ok: true });
		return () => {
			unlistenSpeak.then((fn) => fn());
			unlistenResponse.then((fn) => fn());
			unlistenError.then((fn) => fn());
		};
	}, []);
	return (
		<div
			data-tauri-drag-region
			className={cn(
				"w-screen h-screen overflow-hidden",
				"border rounded-md",
				"flex items-center justify-between",
			)}
		>
			<div
				className="flex items-center justify-start w-full min-h-full truncate overflow-hidden"
				data-tauri-drag-region
			>
				<div
					className="flex items-center cursor-grab overflow-hidden active:cursor-grabbing"
					data-tauri-drag-region
				>
					<Button
						className="opacity-70  hover:bg-transparent dark:hover:bg-transparent cursor-grab  active:cursor-grabbing"
						size={"icon-xs"}
						variant={"ghost"}
						onClick={() => {}}
						data-tauri-drag-region
					>
						<GripVertical
							className=" cursor-grab  active:cursor-grabbing"
							data-tauri-drag-region
						/>
					</Button>
				</div>
				<div className="text-sm truncate overflow-hidden flex-1  text-foreground">
					<span className=" text-foreground">{chat?.response_text}{" "}</span>
					{chat?.response_text ? (
						<span
							className=" text-transparent  selection:bg-transparent  cursor-grab hover:cursor-grabbing"
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
					className="opacity-70 hover:opacity-100 hover:bg-transparent dark:hover:bg-transparent"
					size={"icon-xs"}
					variant={"ghost"}
				>
					<Copyed text={chat?.response_text} />
				</Button>
				<Button
					className="opacity-70 hover:opacity-100 hover:bg-transparent dark:hover:bg-transparent"
					size={"icon-xs"}
					variant={"ghost"}
					onClick={() => {
						console.log("Speak response text:1111111", chat?.response_text);
						speak(chat?.input_text || "");
					}}
				>
					<Volume2 />
				</Button>
				<Button
					className="opacity-70 hover:opacity-100 hover:bg-transparent dark:hover:bg-transparent"
					size={"icon-xs"}
					variant={"ghost"}
					onClick={async () => {
						await invoke(EVENT_NAMES.COMMAND_WINDOW_TRANSLATE_SHOW, {
							input_data: chat,
						});
					}}
				>
					<Maximize2 />
				</Button>
			</div>
		</div>
	);
}
