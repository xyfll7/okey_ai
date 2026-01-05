import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { invoke } from "@tauri-apps/api/core";
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
import { EVENT_NAMES } from "@/lib/events";
import { AutoSpeakState, type ChatMessage } from "@/lib/types";
import { cn, get_global_config, speak } from "@/lib/utils";
import { s_Selected } from "@/store";
import { ArrowUp, Pin, Add, VolumeHigh, Cancel } from "@/components/icons";

export const Route = createFileRoute("/translate/")({
	component: RouteComponent,
});

function RouteComponent() {
	const [chatList, setChatList] = useState<ChatMessage[]>([]);
	useEffect(() => {
		const unlistenResponse = listen<ChatMessage[]>(
			EVENT_NAMES.AI_RESPONSE,
			({ payload }) => {
				console.log("OOOOOO来了");
				setChatList(payload)
			},
		);
		const unlistenError = listen<string>(EVENT_NAMES.AI_ERROR, (event) => {
			const errorPayload: ChatMessage = {
				role: "assistant",
				content: event.payload,
			};
			setChatList((list) => [...list, errorPayload]);
		});
		emit(EVENT_NAMES.PAGE_LOADED, { ok: true });
		return () => {
			unlistenResponse.then((fn) => fn());
			unlistenError.then((fn) => fn());
		};
	}, []);
	return (
		<div className={cn("bg-background", "h-full", "flex-coh")}>
			<Header />
			<div className="mb-2 h-full flex-coh">
				<ChatList chatList={chatList.filter((e) => e.role !== "system")} />
			</div>

			<div className="px-2">
				<Inputer
					onEnter={() => {
						setChatList((list) => [
							...list,
							{
								role: "user",
								content: "",
							},
						]);
					}}
				/>
			</div>
		</div>
	);
}

function Header(props: React.ComponentProps<"div">) {
	const [autoSpeak, setAutoSpeak] = useState<AutoSpeakState>(
		AutoSpeakState.Off,
	);
	useEffect(() => {
		invoke<AutoSpeakState>(EVENT_NAMES.GET_AUTO_SPEAK_STATE).then((res) =>
			setAutoSpeak(res),
		);
	}, []);
	const _ostype = ostype();
	const [hotkey, setHotkey] = useState<string>("");
	useEffect(() => {
		get_global_config().then((config) => {
			setHotkey(
				config?.shortcuts.find((item) => item.name === "okey_ai")?.hot_key
				|| "",
			);
		});
	}, []);
	return (
		<div
			className={cn(
				"p-px",
				"flex items-center",
				{ "justify-between": _ostype === "linux" },
				{ "justify-between": _ostype === "windows" },
				{ "justify-end": _ostype === "macos" },
				props.className,
			)}
			data-tauri-drag-region
		>
			<div className="flex items-center">
				{_ostype === "windows" && <PinWindow />}
				{_ostype === "macos" && (
					<HotKey
						className="mr-2.5"
						hotkey={hotkey}
						onHotkeyChange={(e) => {
							setHotkey(e);
						}}
					/>
				)}
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
							}[autoSpeak]
						}
					</TooltipContent>
				</Tooltip>
				{_ostype === "windows" && (
					<HotKey
						className="ml-1"
						hotkey={hotkey}
						onHotkeyChange={(e) => setHotkey(e)}
					/>
				)}
				{_ostype === "macos" && <PinWindow className="mr-1" />}
			</div>
			{_ostype === "windows" && (
				<Button
					size={"icon-sm"}
					variant={"ghost"}
					onClick={() => invoke(EVENT_NAMES.CLOSE_MAIN_WINDOW)}
				>
					<Cancel strokeWidth={2} />
				</Button>
			)}
		</div>
	);
}

function Inputer({ onEnter }: { onEnter: (message: string) => void }) {
	const [value, setValue] = useState("");
	const selected = useStore(s_Selected, (state) => state);
	return (
		<InputGroup className="mb-2">
			{selected.text && (
				<InputGroupAddon align="block-start">
					<SelectedText />
				</InputGroupAddon>
			)}
			<InputGroupTextarea
				placeholder="Ask, Search or Chat..."
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={async (e) => {
					if (e.key === "Enter" && !e.ctrlKey) {
						e.preventDefault();
						onEnter(value);
						await invoke(EVENT_NAMES.CHAT, {
							input_data: {
								role: "user",
								content: value,
							} as ChatMessage,
						});
						setValue("");
					}
					if (e.key === "Enter" && e.ctrlKey) {
						const target = e.target as HTMLTextAreaElement;
						const start = target.selectionStart;
						const end = target.selectionEnd;
						const newValue = `${value.substring(0, start)}\n${value.substring(end)}`;
						setValue(newValue);
						setTimeout(() => {
							target.selectionStart = target.selectionEnd = start + 1;
						}, 0);
						e.preventDefault();
					}
				}}
			/>
			<InputGroupAddon align="block-end">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<InputGroupButton variant="ghost">Auto</InputGroupButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent side="top" align="start">
						<DropdownMenuItem>Auto</DropdownMenuItem>
						<DropdownMenuItem>Agent</DropdownMenuItem>
						<DropdownMenuItem>Manual</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<InputGroupButton
					variant="default"
					className="rounded-full ml-auto"
					size="icon-xs"
					disabled={!value}
					onClick={async () => {
						await invoke(EVENT_NAMES.CHAT, {
							input_data: {
								role: "user",
								content: value,
							} as ChatMessage,
						});
						setValue("");
					}}
				>
					<ArrowUp strokeWidth={2} />
					<span className="sr-only">Send</span>
				</InputGroupButton>
			</InputGroupAddon>
		</InputGroup>
	);
}

function ChatList({ chatList }: { chatList: ChatMessage[] }) {
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		void chatList;
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [chatList]);

	return (
		<ScrollArea className={cn("h-full")}>
			<div role="none" className="pt-2 px-2 max-w-screen flex-coh">
				{chatList.map((chat, index) => {
					return (
						<MessageItem className="mb-2" key={`chat-${chat.content}-${index}`} chat={chat} />
					);
				})}
				<div ref={messagesEndRef} />
			</div>
		</ScrollArea>
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
			className={cn(className, "px-2 w-full")}
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
						<VolumeHigh strokeWidth={2} />
					</Button>
				</div>
			</div>
		</div>
	);
}

function SelectedText() {
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
						<VolumeHigh
							strokeWidth={2}

						/>
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
							key={e}
							onClick={() => {
								invoke(EVENT_NAMES.TRANSLATE_SPECIFIED_TEXT, {
									specified_text: `${selected.text}\n${e}`,
								});
								console.log("click kbd", e, selected.text);
							}}
						>
							{e}
						</Button>
					))}
					<Button size={"xs"} variant={"outline"}>
						<Add strokeWidth={2} />
					</Button>
				</div>
			)}
		</div>
	);
}

function PinWindow({ className }: { className?: string }) {
	const [pin, setPin] = useState(false);
	useEffect(() => {
		invoke<boolean>(EVENT_NAMES.GET_AUTO_CLOSE_WINDOW_STATE).then((res) =>
			setPin(res),
		);
	}, []);
	return (
		<Button
			size="icon-sm"
			variant="ghost"
			className={cn(className)}
			onClick={async () =>
				setPin(await invoke<boolean>(EVENT_NAMES.TOGGLE_AUTO_CLOSE_WINDOW))
			}
		>
			<Pin
				strokeWidth={2}
				className={cn(pin && "text-green-300 dark:text-green-20")}
			/>
		</Button>
	);
}
