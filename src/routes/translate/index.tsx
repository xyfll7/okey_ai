import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { Channel, invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { type as ostype } from "@tauri-apps/plugin-os";
import Markdown from "markdown-to-jsx";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import AutoSpeakVolume from "@/components/AutoSpeakVolume";
import Copyed from "@/components/Copyed";
import HotKey from "@/components/HotKey";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { EVENT_NAMES, useInvoke } from "@/lib/events";
import { AutoSpeakState, ModelProviderName, type ChatMessage } from "@/lib/types";
import { cn, get_app_config, speak } from "@/lib/utils";
import { s_ChatList, s_CurrentModel, s_Selected } from "@/store";
import { IIArrowUp, IIPin, IIAdd, IIVolumeHigh, IIX } from "@/components/icons";
import { HistoriesNew } from "@/components/HistoriesNew";
import { SettingsNew } from "@/components/SettingsNew";
import type { ModelConfigMap } from "@/@types";


export const Route = createFileRoute("/translate/")({
	component: RouteComponent,
});

type StreamEvent =
	| { event: "chunk"; data: { content: string } }
	| { event: "done"; data?: unknown }
	| { event: "error"; data: { message: string } };

function RouteComponent() {
	const _ostype = ostype();
	return (
		<div className={cn(
			{ "border rounded-xl": ["linux"].includes(_ostype) },
			"bg-background", "h-full", "flex-coh")}>
			<Header className="p-1" />
			<ScrollArea className={cn("h-full flex-coh")}>
				<ChatList className="px-2 pt-2" />
			</ScrollArea>
			<div className="px-2 pb-2">
				<Inputer />
			</div>
		</div>
	);
}

function Header(props: React.ComponentProps<"div">) {
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
			<SettingsNew className="mr-1" />
			<HistoriesNew className="mr-1" />
			<HotKey
				className="mr-1 px-1"
				hotkey={hotkey}
				onHotkeyChange={(e) => { setHotkey(e) }}
			/>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button size="icon-sm" variant="ghost">
						<AutoSpeakVolume />
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					{
						{
							[AutoSpeakState.Off]: "Speech off",
							[AutoSpeakState.Single]: "Read single words only",
							[AutoSpeakState.All]: "Read full sentences",
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
								[AutoSpeakState.Off]: "Speech off",
								[AutoSpeakState.Single]: "Read single words only",
								[AutoSpeakState.All]: "Read full sentences",
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
			</div>
			<div className=" flex">
				<SettingsNew />
				<Button
					className="ml-1"
					size={"icon-sm"}
					variant={"ghost"}
					onClick={() => invoke(EVENT_NAMES.close_main_window)}
				>
					<IIX />
				</Button>
			</div>
		</div>
	);
}

function Inputer({ className }: { className?: string; }) {
	const handleStream = async (chatMessage: ChatMessage) => {
		let accumulated = "";
		const channel = new Channel<StreamEvent>();
		channel.onmessage = (message) => {
			switch (message.event) {
				case "chunk": {
					accumulated += message.data?.content ?? "";
					s_ChatList.setState((list) => {
						if (list.at(-1)?.role !== "assistant") {
							return [...list, { role: "assistant", content: accumulated }];
						}
						const next = [...list];
						next[next.length - 1] = {
							...next[next.length - 1]!,
							content: accumulated,
						};
						return next;
					});
					break;
				}
				case "error": {
					const errorContent = message.data?.message ?? "流式请求失败";
					s_ChatList.setState((list) => {
						if (list.length === 0) {
							return [
								...list,
								{ role: "assistant", content: errorContent },
							];
						}
						const next = [...list];
						const last = next[next.length - 1];
						if (last.role === "assistant") {
							next[next.length - 1] = {
								...last,
								content: errorContent,
							};
							return next;
						}
						return [
							...next,
							{ role: "assistant", content: errorContent },
						];
					});
					break;
				}
				default:
					break;
			}
		};

		await invoke(EVENT_NAMES.chat_stream, {
			chat_message: chatMessage,
			on_event: channel,
		});
	};

	const [value, setValue] = useState("");
	const selected = useStore(s_Selected, (state) => state);


	const { ...modelsList_X } = useInvoke<ModelConfigMap>(EVENT_NAMES.list_available_models, {});
	
	const currentModel = useStore(s_CurrentModel,(state => state))
	return (
		<InputGroup className={cn(className, "rounded-xl", "has-[[data-slot=input-group-control]:focus-visible]:border-ring/70 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/7")}>
			{selected.text && (
				<InputGroupAddon align="block-start">
					<SelectedText onStream={handleStream} />
				</InputGroupAddon>
			)}
			<InputGroupTextarea
				placeholder="Ask, Search or Chat..."
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={async (e) => {
					if (e.key === "Enter" && !e.shiftKey) {
						e.preventDefault();
						setValue("");
						await handleStream({ role: "user", content: value } as ChatMessage)
					}
					if (e.key === "Enter" && e.shiftKey) {
						e.preventDefault();
						const target = e.target as HTMLTextAreaElement;
						const start = target.selectionStart;
						const end = target.selectionEnd;
						const newValue = `${value.substring(0, start)}\n${value.substring(end)}`;
						setValue(newValue);
						setTimeout(() => {
							target.selectionStart = target.selectionEnd = start + 1;
						}, 0);

					}
				}}
			/>
			<InputGroupAddon align="block-end">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<InputGroupButton variant="ghost">{currentModel}</InputGroupButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent side="top" align="start">
						{modelsList_X.state && Object.keys(modelsList_X.state).map((key) => (
							<DropdownMenuItem onSelect={async () => {
								await invoke(EVENT_NAMES.switch_model, { model_name: key})
								s_CurrentModel.setState(key)
							}} key={key}>{ModelProviderName[key as keyof typeof ModelProviderName] }</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				<InputGroupButton
					variant="default"
					className="rounded-full ml-auto cursor-pointer"
					size="icon-xs"
					disabled={!value}
					onClick={async () => {
						setValue("");
						await handleStream({ role: "user", content: value } as ChatMessage)
					}}
				>
					<IIArrowUp />
					<span className="sr-only">Send</span>
				</InputGroupButton>
			</InputGroupAddon>
		</InputGroup>
	);
}

function ChatList({ className }: { className?: string; }) {
	const chatList = useStore(s_ChatList, (state) => state.filter((e) => e.role !== "system"));
	const lastItem = chatList.at(-1)
	const rest = chatList.slice(0, -1);
	useEffect(() => {
		const unlistenResponse = listen<ChatMessage[]>(
			EVENT_NAMES.AI_RESPONSE,
			({ payload }) => {
				const chat = payload.at(-1)?.role === "user" ? payload.at(-1) : payload.at(-2)
				if (chat?.raw && chat.role === "user") {
					s_Selected.setState({
						text: chat.raw,
						raw: chat.content,
					});
				}
				s_ChatList.setState(payload);
				console.log(payload)
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
		<div role="none" className={cn(className, "max-w-screen flex-coh")}>
			{rest.map((chat, index) => {
				return (
					<MessageItem className="px-2.5 mb-2" key={`chat-${chat.content}-${index}`} chat={chat} />
				);
			})}
			{lastItem && lastItem.role === "assistant" && <MessageItem className="px-2.5 mb-2" chat={lastItem} />}
			{lastItem?.role !== "assistant" && <div className="px-2.5">...</div>}
		</div>
	);
}

function MessageItem({ chat, className }: { chat: ChatMessage, className?: string }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const isMouseInsideRef = useRef<boolean>(false);

	function extractSelectedText() {
		// 只在鼠标在当前组件内部时才处理
		if (!isMouseInsideRef.current) return;

		const selection = window.getSelection();
		const selectedText = selection?.toString().trim();

		if (selectedText) {
			// 检查选中的文本是否在当前组件内
			if (selection && containerRef.current) {
				const range = selection.getRangeAt(0);
				if (containerRef.current.contains(range.commonAncestorContainer)) {
					s_Selected.setState({
						text: selectedText,
						raw: chat.content,
					});
				}
			}
		}
	}

	function handleMouseEnter() {
		isMouseInsideRef.current = true;
	}

	function handleMouseLeave() {
		isMouseInsideRef.current = false;
		// 鼠标移出时什么也不做，保留已选中的文本
	}

	return (
		<div
			ref={containerRef}
			role="none"
			className={cn(className, " w-full")}
			onMouseUp={extractSelectedText}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<div className="wrap-break-word ">
				<Markdown className="mb-2">{chat.raw ?? chat.content}</Markdown>
				<div className="flex items-center">
					<Button size={"icon-sm"} variant={"ghost"}>
						<Copyed text={chat.content} />
					</Button>
					<Button size={"icon-sm"} variant={"ghost"} onClick={() => speak(chat.raw ?? chat.content)} >
						<IIVolumeHigh />
					</Button>
				</div>
			</div>
		</div>
	);
}

function SelectedText({ onStream }: { onStream: (chatMessage: ChatMessage) => Promise<void> }) {
	const selected = useStore(s_Selected, (state) => state);
	if (!selected.text) return "";
	return (
		<div className="w-full">
			<div className="w-full flex items-center mb-1">
				<div className="max-w-full truncate overflow-hidden">
					<span className={cn("mr-1")}>{selected.text}</span>
				</div>
				{selected.text?.trim() && (
					<Button size={"icon-sm"} variant={"ghost"}>
						<Copyed
							key={selected.text}
							text={selected.text}
						/>
					</Button>
				)}
				{selected.text?.trim() && (
					<Button size={"icon-sm"} variant={"ghost"} onClick={() => {
						if (!selected.text) return;
						speak(selected.text);
					}}>
						<IIVolumeHigh />
					</Button>
				)}
				{selected.text?.trim() && (
					<Button size={"icon-sm"} variant={"ghost"} onClick={() => {
						s_Selected.setState({ text: "", raw: "" })
					}}>
						<IIX />
					</Button>
				)}
			</div>
			{selected.text?.trim() && (
				<div className="flex flex-wrap">
					{["单词详解", "在句中的含义", "详解", "解读",].map((e, i) => (
						<Button
							className="mr-1 mb-1"
							size={"xs"}
							variant={"outline"}
							key={`${e}-${i}`}
							onClick={() => {
								void onStream({
									role: "user",
									content: `${selected.text}\n${e}`,
									raw: selected.text,
								} as ChatMessage);
							}}
						>
							{e}
						</Button>
					))}
					<Button size={"xs"} variant={"outline"}>
						<IIAdd />
					</Button>
				</div>
			)
			}
		</div >
	);
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
			<IIPin
				className={cn(pin_X.state && "text-green-300 dark:text-green-20")}
			/>
		</Button>
	);
}
