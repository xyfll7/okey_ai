import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { type as ostype } from "@tauri-apps/plugin-os";
import { ArrowUpIcon, Pin, Plus, Volume2, X } from "lucide-react";
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
import { Kbd, KbdGroup } from "@/components/ui/kbd";
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

export const Route = createFileRoute("/translate/")({
	component: RouteComponent,
});

function RouteComponent() {
	const [chatList, setChatList] = useState<ChatMessage[]>([]);
	useEffect(() => {
		const unlistenResponse = listen<ChatMessage[]>(
			EVENT_NAMES.AI_RESPONSE,
			({ payload }) => setChatList(payload),
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
		<div className={cn("h-full", "flex-coh")}>
			<Header />
			<div className="mb-2 h-full flex-coh">
				<ChatList chatList={chatList.filter((e) => e.role !== "system")} />
			</div>

			<div className="px-2">
				<Inputer
					onEnter={(e) => {
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
				config?.shortcuts.find((item) => item.name === "okey_ai")?.hot_key ||
					"",
			);
		});
	}, []);
	return (
		<div
			className={cn(
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
					<X size={"1rem"} />
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
					<ArrowUpIcon />
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
		<ScrollArea className="h-full ">
			<div role="none" className="pt-2 px-2 max-w-screen flex-coh">
				{chatList.map((chat, index) => {
					return (
						<MessageItem key={`chat-${chat.content}-${index}`} chat={chat} />
					);
				})}
				<div ref={messagesEndRef} />
			</div>
		</ScrollArea>
	);
}

function MessageItem({ chat }: { chat: ChatMessage }) {
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
			className="px-2 mb-4 w-full"
			onMouseUp={extractSelectedText}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<div className="mb-2 wrap-break-word ">
				<Markdown className="mb-2">{chat.raw ?? chat.content}</Markdown>
				<div className="flex items-center">
					<Button size={"icon-sm"} variant={"ghost"}>
						<Copyed text={chat.content} />
					</Button>
					<Button size={"icon-sm"} variant={"ghost"}>
						<Volume2 onClick={() => speak(chat.raw ?? chat.content)} />
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
		<div>
			<div className="w-full flex items-center">
				<div className="max-w-full truncate overflow-hidden">
					<span className={cn("mr-1 opacity-50")}>{selected.text}</span>
				</div>
				{selected.text?.trim() && (
					<Button size={"icon-sm"} variant={"ghost"}>
						<Copyed
							key={selected.text}
							text={selected.text}
							className={cn("mr-1 ")}
						/>
					</Button>
				)}
				{selected.text?.trim() && (
					<Button size={"icon-sm"} variant={"ghost"}>
						<Volume2
							className={cn("mr-1 ")}
							onClick={() => {
								if (!selected.text) return;
								speak(selected.text);
							}}
						/>
					</Button>
				)}
			</div>
			{selected.text?.trim() && (
				<KbdGroup className="flex-wrap">
					{["单词详解", "在句中的含义", "详解", "解读"].map((e) => (
						<Kbd
							key={e}
							onClick={() => {
								invoke(EVENT_NAMES.TRANSLATE_SPECIFIED_TEXT, {
									specified_text: `${selected.text}\n${e}`,
								});
								console.log("click kbd", e, selected.text);
							}}
						>
							{e}
						</Kbd>
					))}
					<Kbd>
						<Plus/>
					</Kbd>
				</KbdGroup>
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
				size={"1rem"}
				className={cn(pin && "text-green-300 dark:text-green-200")}
			/>
		</Button>
	);
}
