import React from "react";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { type as ostype } from "@tauri-apps/plugin-os";
import AutoSpeakVolume from "@/components/AutoSpeakVolume";
import HotKey from "@/components/HotKey";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { EVENT_NAMES, useInvoke } from "@/lib/events";
import { AutoSpeakState } from "@/lib/types";
import type { UIMessage } from "@tanstack/ai/client";
import { cn, get_app_config } from "@/lib/utils";
import { s_Selected } from "@/store";
import { m } from "@/paraglide/messages.js";
import { Icons } from "@/components/icon";
import { HistoriesNew } from "@/components/HistoriesNew";
import { SettingsNew } from "@/components/SettingsNew";
import { useChatContext } from "@/components/chat/chatContext";

function CreateNewSession() {
	const { setMessages } = useChatContext()
	const { ...loadingChat_X } = useInvoke<boolean>(EVENT_NAMES.get_chatting_state, false, false, undefined, EVENT_NAMES.CHATTING_STATE_CHANGE);
	return <Button size={"icon-sm"} variant={"ghost"} disabled={loadingChat_X.state} onClick={async () => {
		await invoke(EVENT_NAMES.create_new_session);
		const history = await invoke<UIMessage[]>(EVENT_NAMES.get_current_history);
		setMessages(history)
		s_Selected.setState(() => ({ text: "", }));
	}}>
		<Icons.chat />
	</Button>;
}

function PinWindow({ className }: { className?: string }) {
	const { ...pin_X } = useInvoke(EVENT_NAMES.is_pin_translate_window_get, false);
	return (
		<Button
			size="icon-sm"
			variant="ghost"
			className={cn(className)}
			onClick={async () =>
				pin_X.setState(await invoke<boolean>(EVENT_NAMES.is_pin_translate_window_toggle))
			}
		>
			<Icons.pin
				className={cn(pin_X.state && "text-green-300 dark:text-green-20")}
			/>
		</Button>
	);
}

export function Header(props: React.ComponentProps<"div">) {
	const { ...autoSpeak_X } = useInvoke<AutoSpeakState>(EVENT_NAMES.get_auto_speak_state, AutoSpeakState.Off);
	const _ostype = ostype();
	const [hotkey, setHotkey] = useState<string>("");
	useEffect(() => {
		get_app_config().then((config) => {
			setHotkey(
				config?.shortcuts.find((item) => item.name === "okey_ai")?.hot_key
				|| "",
			);
		});
	}, []);

	if (["macos"].includes(_ostype)) {
		return <div
			className={cn(
				"flex items-center justify-end",
				props.className,
			)}
			data-tauri-drag-region
		>
			<CreateNewSession />
			<HistoriesNew className="mr-1" />
			<HotKey
				className="mr-1 px-1"
				hotkey={hotkey}
				onHotkeyChange={(e) => { setHotkey(e) }}
			/>
			<SettingsNew className="mr-1" />
			<Tooltip>
				<TooltipTrigger asChild>
					<Button size="icon-sm" variant="ghost">
						<AutoSpeakVolume />
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					{
						{
							[AutoSpeakState.Off]: m.auto_speak_off(),
							[AutoSpeakState.Single]: m.auto_speak_single(),
							[AutoSpeakState.All]: m.auto_speak_all(),
						}[autoSpeak_X.state]
					}
				</TooltipContent>
			</Tooltip>
			<PinWindow className="mr-1" />
		</div>
	}
	return (
		<div
			className={cn(
				"flex items-center justify-between",
				props.className,
			)}
			data-tauri-drag-region
		>
			<div className="flex items-center">
				<PinWindow />
				<Tooltip>
					<TooltipTrigger asChild>
						<Button size="icon-sm" variant="ghost">
							<AutoSpeakVolume />
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						{
							{
								[AutoSpeakState.Off]: m.auto_speak_off(),
								[AutoSpeakState.Single]: m.auto_speak_single(),
								[AutoSpeakState.All]: m.auto_speak_all(),
							}[autoSpeak_X.state]
						}
					</TooltipContent>
				</Tooltip>
				<HotKey
					className="ml-1"
					hotkey={hotkey}
					onHotkeyChange={(e) => setHotkey(e)}
				/>
				<HistoriesNew className="ml-1" />
				<CreateNewSession />
			</div>
			<div className=" flex">
				<SettingsNew />
				<Button
					className="ml-1"
					size={"icon-sm"}
					variant={"ghost"}
					onClick={() => invoke(EVENT_NAMES.close_main_window)}
				>
					<Icons.x />
				</Button>
			</div>
		</div>
	);
}
