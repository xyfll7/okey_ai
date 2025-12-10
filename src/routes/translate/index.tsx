import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { type as ostype } from "@tauri-apps/plugin-os";
import {
	ArrowUpIcon,
	Check,
	Clipboard,
	Pin,
	Plus,
	Volume1,
	Volume2,
	VolumeOff,
	X,
} from "lucide-react";

import Markdown from "markdown-to-jsx";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
import type { InputData } from "@/lib/types";
import { cn, speak } from "@/lib/utils";

enum AutoSpeakState {
	Off = "off",
	Single = "single",
	All = "all",
}

export const Route = createFileRoute("/translate/")({
	component: RouteComponent,
});

function RouteComponent() {
	const [chatList, setChatList] = useState<InputData[]>([]);

	useEffect(() => {
		const unlistenSpeak = listen<InputData>(
			EVENT_NAMES.AUTO_SPEAK,
			({ payload }) => {
				invoke<AutoSpeakState>("get_auto_speak_state").then((res) => {
					const isSingleWord =
						payload.input_text.trim().split(/\s+/).length === 1;
					if (
						(res === AutoSpeakState.Single && isSingleWord) ||
						(res === AutoSpeakState.All && payload.input_text.trim().length > 0)
					) {
						speak(payload.input_text);
					}
				});
			},
		);
		const unlistenResponse = listen<InputData>(
			EVENT_NAMES.AI_RESPONSE,
			({ payload }) => {
				setChatList((list) => {
					const existingIndex = list.findIndex(
						(item) =>
							item.input_time_stamp === payload.input_time_stamp &&
							item.input_text === payload.input_text,
					);

					if (existingIndex !== -1) {
						const updatedList = [...list];
						updatedList[existingIndex] = payload;
						return updatedList;
					} else {
						return [...list, payload];
					}
				});
			},
		);
		const unlistenError = listen<string>(EVENT_NAMES.AI_ERROR, (event) => {
			const errorPayload: InputData = {
				input_time_stamp: Date.now().toString(),
				input_text: "Error occurred",
				response_text: event.payload,
			};
			setChatList((list) => [...list, errorPayload]);
		});
		emit(EVENT_NAMES.PAGE_LOADED, { ok: true });
		return () => {
			unlistenSpeak.then((fn) => fn());
			unlistenResponse.then((fn) => fn());
			unlistenError.then((fn) => fn());
		};
	}, []);
	return (
		<div className="h-screen max-h-screen max-w-screen flex-coh">
			<Header />
			<div className="mb-2 h-full flex-coh">
				<ChatList chatList={chatList}></ChatList>
			</div>

			<div className="px-2">
				<Inputer
					onEnter={(e) => {
						setChatList((list) => [
							...list,
							{
								input_time_stamp: Date.now().toString(),
								input_text: e,
								response_text: "",
							},
						]);
					}}
				/>
			</div>
		</div>
	);
}

function Header(props: React.ComponentProps<"div">) {
	const [pin, setPin] = useState(false);
	const [autoSpeak, setAutoSpeak] = useState<AutoSpeakState>(
		AutoSpeakState.Off,
	); // Three possible states: off, single word, full sentence
	useEffect(() => {
		invoke<boolean>("get_auto_close_window_state").then((res) => setPin(res));
		invoke<AutoSpeakState>("get_auto_speak_state").then((res) =>
			setAutoSpeak(res),
		);
	}, []);
	const _ostype = ostype();

	const PinButton = (
		<Button
			size="icon-sm"
			variant="ghost"
			className=" opacity-70 hover:opacity-100 hover:bg-transparent dark:hover:bg-transparent"
			onClick={async () =>
				setPin(await invoke<boolean>("toggle_auto_close_window"))
			}
		>
			<Pin
				size={"1rem"}
				className={cn(pin && "text-green-300 dark:text-green-200")}
			/>
		</Button>
	);

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
			<div className=" flex items-center">
				{_ostype === "windows" && PinButton}
				{_ostype === "macos" && <HotKey  className="mr-3" />}
				<Tooltip>
					<TooltipTrigger>
						<div
							role="none"
							onClick={async () =>
								setAutoSpeak(await invoke<AutoSpeakState>("toggle_auto_speak"))
							}
						>
							{
								{
									[AutoSpeakState.Off]: <VolumeOff size={"1rem"} />,
									[AutoSpeakState.Single]: <Volume1 size={"1rem"} />,
									[AutoSpeakState.All]: <Volume2 size={"1rem"} />,
								}[autoSpeak]
							}
						</div>
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
				{_ostype === "windows" && <HotKey className="ml-2" />}
				{_ostype === "macos" && PinButton}
			</div>
			{_ostype === "windows" && (
				<Button
					size={"icon-sm"}
					variant={"ghost"}
					className="opacity-70 hover:opacity-100 hover:bg-transparent dark:hover:bg-transparent"
					onClick={() => invoke("close_main_window")}
				>
					<X size={"1rem"} />
				</Button>
			)}
		</div>
	);
}

function Inputer({ onEnter }: { onEnter: (message: string) => void }) {
	const [value, setValue] = useState("");
	return (
		<InputGroup className="mb-2 [--radius:1.1rem] p-0!">
			<InputGroupTextarea
				className={cn(
					"max-h-40 scrollbar-hide",
					"[&::-webkit-scrollbar]:hidden",
					"[scrollbar-width:none]",
					"[ms-overflow-style:none]",
				)}
				placeholder="Ask, Search or Chat..."
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={async (e) => {
					if (e.key === "Enter" && !e.ctrlKey) {
						e.preventDefault();
						onEnter(value);
						await invoke("chat", {
							input_data: {
								input_time_stamp: Date.now().toString(),
								input_text: value,
								response_text: null,
							},
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
					<DropdownMenuContent
						side="top"
						align="start"
						className="[--radius:0.95rem]"
					>
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
						await invoke("chat", {
							input_data: {
								input_time_stamp: Date.now().toString(),
								input_text: value,
								response_text: null,
							},
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
function Copyed({ className }: { className?: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<>
			{!copied ? (
				<Clipboard
					className={cn(className)}
					onClick={() => {
						setCopied(true);
					}}
				/>
			) : (
				<Check
					className={cn(className)}
					onClick={() => {
						setCopied(true);
					}}
				/>
			)}
		</>
	);
}

function ChatList({ chatList }: { chatList: InputData[] }) {
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
						<MessageItem
							key={`chat-${chat.input_time_stamp}-${index}`}
							chat={chat}
						/>
					);
				})}
				<div ref={messagesEndRef} />
			</div>
		</ScrollArea>
	);
}

// Individual message item component
function MessageItem({ chat }: { chat: InputData }) {
	const [selectedText, setSelectedText] = useState<string>("");
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
					setSelectedText(selectedText);
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
			className="px-2 text-sm text-muted-foreground mb-4 w-full"
			onMouseUp={extractSelectedText}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<div className="mb-1 wrap-break-word">
				<span className="mr-1">{chat.input_text}</span>
				<Copyed className="mr-1 inline size-4 translate-y-[-0.8px] opacity-70 hover:opacity-100" />
				<Volume2
					className="inline size-4 translate-y-[-0.8px] opacity-70 hover:opacity-100"
					onClick={() => speak(chat.input_text)}
				/>
			</div>
			<div className="mb-1 wrap-break-word">
				{chat.response_text ? <Markdown>{chat.response_text}</Markdown> : "..."}
			</div>
			<SelectedText selectedText={selectedText} />
		</div>
	);
}

function SelectedText({ selectedText }: { selectedText?: string }) {
	if (!selectedText) return null;
	return (
		<div className=" w-full [&_svg:not([class*='size-'])]:size-4 [&_svg]:cursor-pointer select-none">
			<div className="w-full flex items-center mb-1">
				<div className="max-w-full truncate overflow-hidden">
					<span className={cn("mr-1 opacity-50 text-sm")}>{selectedText}</span>
				</div>
				{selectedText?.trim() && (
					<>
						<Copyed
							key={selectedText}
							className="mr-1 inline translate-y-[0.8px] min-w-4  opacity-70 hover:opacity-100"
						/>
						<Volume2
							className="mr-1 inline translate-y-[0.8px] min-w-4  opacity-70 hover:opacity-100"
							onClick={() => {
								if (!selectedText) return;
								speak(selectedText);
							}}
						/>
					</>
				)}
			</div>
			{selectedText?.trim() && (
				<KbdGroup className=" flex-wrap">
					{[
						"单词详解",
						"在句中的含义",
						"讲解",
						"解读",
						"解读",
						"解读",
						"解读",
						"解读",
						"解读",
						"解读",
						"解读",
						"解读",
						"解读",
					].map((i) => (
						<Kbd
							key={i}
							className=" cursor-pointer! rounded-full pointer-events-auto text-nowrap"
						>
							{i}
						</Kbd>
					))}
					<Kbd className=" cursor-pointer! rounded-full pointer-events-auto text-nowrap">
						<Plus className=" size-3" />
					</Kbd>
				</KbdGroup>
			)}
		</div>
	);
}

function HotKey({className}: {className?: string}) {
	const [hotkey, setHotkey] = useState<string>("Ctrl+K");
	const { t } = useTranslation();
	const [isRecording, setIsRecording] = useState<boolean>(false);
	const [keys, setKeys] = useState<string[]>([]);
	const inputRef = useRef<HTMLButtonElement>(null);

	const displayContent = (() => {
		if (isRecording) {
			if (keys.length > 0) {
				return keys;
			}
			return null;
		}
		const parsedValue = !hotkey ? [] : hotkey.split("+").map((k) => k.trim());
		return parsedValue.length > 0 ? parsedValue : null;
	})();

	const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
		if (!isRecording) return;

		e.preventDefault();
		e.stopPropagation();

		const pressedKeys: string[] = [];

		if (e.ctrlKey || e.metaKey) pressedKeys.push(e.ctrlKey ? "Ctrl" : "Cmd");
		if (e.altKey) pressedKeys.push("Alt");
		if (e.shiftKey) pressedKeys.push("Shift");

		if (!["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
			const formatKey = (key: string): string => {
				const keyMap: Record<string, string> = {
					Control: "Ctrl",
					Meta: "Cmd",
					Alt: "Alt",
					Shift: "Shift",
					" ": "Space",
				};
				return keyMap[key] || key.toUpperCase();
			};
			pressedKeys.push(formatKey(e.key));
		}

		if (pressedKeys.length > 0) {
			setKeys(pressedKeys);
		}
	};

	const handleKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
		if (!isRecording) return;
		e.preventDefault();
		e.stopPropagation();

		if (
			!e.ctrlKey &&
			!e.altKey &&
			!e.shiftKey &&
			!e.metaKey &&
			keys.length > 0
		) {
			const newHotkey = keys.join("+");
			console.log("New hotkey set:", newHotkey);
			invoke(EVENT_NAMES.REGISTER_HOTKEY, { shortcut: newHotkey });
			setHotkey(newHotkey);
			setIsRecording(false);
			inputRef.current?.blur();
		}
	};

	const handleClick = () => {
		setIsRecording(true);
		setKeys([]);
		inputRef.current?.focus();
	};

	const handleBlur = () => {
		setIsRecording(false);
		setKeys([]);
	};

	return (
		<div className={cn("relative inline-flex items-center gap-2",className)}>
			<Button
				ref={inputRef}
				tabIndex={0}
				className="px-1 hover:bg-transparent dark:hover:bg-transparent"
				size="sm"
				variant="ghost"
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				onKeyUp={handleKeyUp}
				onBlur={handleBlur}
			>
				<KbdGroup>
					<Kbd>
						<span className="mr-1">
							{displayContent ? (
								displayContent.map((key, index) => (
									<React.Fragment key={`${key}-`}>
										{key}
										{index < displayContent.length - 1 && <span>+</span>}
									</React.Fragment>
								))
							) : (
								<span className=" opacity-70">
									{t(($) => $.translate.press_to_set_hotkey)}
								</span>
							)}
						</span>
						{isRecording && (
							<span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
						)}
					</Kbd>
				</KbdGroup>
			</Button>
		</div>
	);
}
