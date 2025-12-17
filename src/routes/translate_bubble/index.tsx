import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { GripVertical, Maximize2 } from "lucide-react";
import { useEffect, useState } from "react";
import AutoSpeakVolume from "@/components/AutoSpeakVolume";
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
				"flex items-center w-screen h-screen",
				"overflow-hidden",
				"p-px",
			)}
		>
			<div
				data-tauri-drag-region
				className="flex items-center justify-between h-full border rounded-md w-full bg-background overflow-hidden "
			>
				<div
					className="flex items-center w-full min-h-full overflow-hidden"
					data-tauri-drag-region
				>
					{/* <AudioRecording color={cn(is ? "bg-green-700" : "bg-yellow-700")} /> */}
					<div
						className=" flex items-center cursor-grab  active:cursor-grabbing"
						data-tauri-drag-region
					>
						<Button
							className="opacity-70  hover:bg-transparent dark:hover:bg-transparent cursor-grab  active:cursor-grabbing"
							size={"icon-xs"}
							variant={"ghost"}
							onClick={() => {
								console.log("12321311111111111111111111111111.............");
							}}
							data-tauri-drag-region
						>
							<GripVertical
								className=" cursor-grab  active:cursor-grabbing"
								data-tauri-drag-region
							/>
						</Button>
					</div>

					<div className="flex text-sm items-center min-h-full truncate overflow-hidden flex-1 w-full min-w-0">
						{chat?.response_text ?? <span>...</span>}
						<div className="h-8 min-w-2xs" data-tauri-drag-region></div>
					</div>
				</div>
				<Button
					className="opacity-70  hover:opacity-100 hover:bg-transparent dark:hover:bg-transparent"
					size={"icon-xs"}
					variant={"ghost"}
					onClick={() => {
						console.log("12321311111111111111111111111111.............");
					}}
				>
					<AutoSpeakVolume />
				</Button>
				<Button
					className="opacity-70  hover:opacity-100 hover:bg-transparent dark:hover:bg-transparent"
					size={"icon-xs"}
					variant={"ghost"}
					onClick={async() => {
							await invoke<AutoSpeakState>(EVENT_NAMES.COMMAND_WINDOW_TRANSLATE_SHOW)
					}}
				>
					<Maximize2 />
				</Button>
			</div>
		</div>
	);
}
