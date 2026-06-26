// @refresh reset
// 或
// @refresh only-export-components
import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { type as ostype } from "@tauri-apps/plugin-os";
import Markdown from "markdown-to-jsx";
import React from "react";
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
import { AutoSpeakState, getModelProviderShowName, type ChatMessage } from "@/lib/types";
import { cn, get_app_config, speak } from "@/lib/utils";
import { handleStream, s_ChatList, s_CurrentModel, s_LoadingChat, s_Selected, s_StreamingContent } from "@/store";
import { IIArrowUp, IIPin, IIAdd, IIVolumeHigh, IIX, IIChat } from "@/components/icons";
import { HistoriesNew } from "@/components/HistoriesNew";
import { SettingsNew } from "@/components/SettingsNew";
import { useTranslation } from "react-i18next";
import type { ModelConfigMap } from "@/@types";
import { IIExchange, IIStop } from "@/components/icons/hugeicons";

export const Route = createFileRoute("/translate/")({
	component: RouteComponent,
});


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
			<LanguageSelector />
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

	const CreateNewSession = () => <Button size={"icon-sm"} variant={"ghost"} onClick={async () => {
		await invoke(EVENT_NAMES.create_new_session);
		const history = await invoke<ChatMessage[]>(EVENT_NAMES.get_current_history);
		s_ChatList.setState(() => history);
		s_Selected.setState(() => ({ text: "", raw: "" }));
	}}>
		<IIChat />
	</Button>

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
					<IIX />
				</Button>
			</div>
		</div>
	);
}

function Inputer({ className }: { className?: string; }) {
	const [value, setValue] = useState("");
	const selected = useStore(s_Selected, (state) => state);


	const { ...modelsList_X } = useInvoke<ModelConfigMap>(EVENT_NAMES.list_available_models, {});

	const currentModel = useStore(s_CurrentModel, (state => state))
	const { t } = useTranslation();
	const loadingChat = useStore(s_LoadingChat, (state => state))
	return (
		<InputGroup className={cn(className, "rounded-xl", "has-[[data-slot=input-group-control]:focus-visible]:border-ring/70 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/7")}>
			{selected.text && (
				<InputGroupAddon align="block-start">
					<SelectedText onHandleStream={handleStream} />
				</InputGroupAddon>
			)}
			<InputGroupTextarea
				placeholder="Ask, Search or Chat..."
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={async (e) => {
					if (loadingChat) {
						return;
					}
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
					<DropdownMenuTrigger asChild disabled={loadingChat}>
						<InputGroupButton variant="ghost">{getModelProviderShowName(t)[currentModel as keyof ReturnType<typeof getModelProviderShowName>]}</InputGroupButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent side="top" align="start">
						{modelsList_X.state && Object.keys(modelsList_X.state)
							.sort((a, b) => {
								const indexA = modelsList_X.state![a].index;
								const indexB = modelsList_X.state![b].index;
								return indexA - indexB;
							})
							.map((key) => (
								<DropdownMenuItem onSelect={async () => {
									await invoke(EVENT_NAMES.switch_model, { model_name: key })
									s_CurrentModel.setState(() => key)
								}} key={key}>{getModelProviderShowName(t)[key as keyof ReturnType<typeof getModelProviderShowName>]}</DropdownMenuItem>
							))}
					</DropdownMenuContent>
				</DropdownMenu>

				<InputGroupButton
					variant="default"
					className="rounded-full ml-auto cursor-pointer"
					size="icon-xs"
					onClick={async () => {
						if (loadingChat) {
							await invoke(EVENT_NAMES.abort_chat_stream);
							s_LoadingChat.setState(() => false);
							return;
						}
						setValue("");
						await handleStream({ role: "user", content: value } as ChatMessage)
					}}
				>
					{loadingChat ? <IIStop /> : <IIArrowUp />}
					<span className="sr-only">{loadingChat ? "abort" : "send"}</span>
				</InputGroupButton>
			</InputGroupAddon>
		</InputGroup>
	);
}

function ChatList({ className }: { className?: string; }) {
	const chatList = useStore(s_ChatList, (state) => state.filter((e) => e.role !== "system"));
	const streamingContent = useStore(s_StreamingContent, (state) => state);
	const loadingChat = useStore(s_LoadingChat, (state) => state);


	useEffect(() => {
		invoke<ChatMessage[]>(EVENT_NAMES.get_current_history).then((history) => {
			s_ChatList.setState(() => history);
			s_StreamingContent.setState(() => "");
		})
		const unlistenResponse = listen<ChatMessage[]>(
			EVENT_NAMES.AI_RESPONSE,
			({ payload }) => {
				const chat = payload.at(-1)?.role === "user" ? payload.at(-1) : payload.at(-2)
				if (chat?.raw && chat.role === "user") {
					s_Selected.setState(() => ({
						text: chat.raw!,
						raw: chat.content,
					}));
				}

				// 恢复：用 AI_RESPONSE 的 payload 更新 s_ChatList
				s_ChatList.setState(() => payload);

				// 滚动逻辑移到这里
				const filtered = payload.filter((e) => e.role !== "system");
				const lastItem = filtered.at(-1);
				if (filtered.length > 2 && lastItem?.role === "user") {
					setTimeout(() => {
						const container = document.querySelector('[data-chat-container]');
						if (!container) return;
						const lastIndex = filtered.length - 1;
						const targetItem = container.querySelector(`[data-index="${lastIndex}"]`);
						if (targetItem) {
							targetItem.scrollIntoView({ behavior: "smooth", block: "start" });
						}
					}, 300);
				}
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
		<div role="none" className={cn(className, "max-w-screen flex-coh")} data-chat-container>
			{chatList.map((chat, index) => {
				return (
					<MessageItem className="px-2.5 mb-2" key={`msg-${index}`} chat={chat} index={index} />
				);
			})}
			{streamingContent && <StreamingMessage content={streamingContent} />}
			{!streamingContent && loadingChat && <div className="px-2.5">...</div>}
		</div>
	);
}

const StreamingMessage = React.memo(function StreamingMessage({ content }: { content: string }) {
	const [displayed, setDisplayed] = useState(content);
	useEffect(() => {
		const id = requestAnimationFrame(() => setDisplayed(content));
		return () => cancelAnimationFrame(id);
	}, [content]);
	return (
		<div className="px-2.5 mb-2 w-full">
			<Markdown className="mb-2">{displayed}</Markdown>
		</div>
	);
}, (prev, next) => prev.content === next.content);

const MessageItem = React.memo(function MessageItem({ chat, className, index }: { chat: ChatMessage, className?: string, index: number }) {
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
					s_Selected.setState(() => ({
						text: selectedText,
						raw: chat.content,
					}));
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
			data-index={index}
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
}, (prev, next) => prev.chat.content === next.chat.content && prev.chat.raw === next.chat.raw);

function SelectedText({ onHandleStream }: { onHandleStream: (chatMessage: ChatMessage) => Promise<void> }) {
	const selected = useStore(s_Selected, (state) => state);
	if (!selected.text) return "";
	const loadingChat = useStore(s_LoadingChat, (state) => state);
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
						s_Selected.setState(() => ({ text: "", raw: "" }))
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
							disabled={loadingChat}
							onClick={() => {
								void onHandleStream({
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


export default function LanguageSelector() {
	const [localLanguage, setLocalLanguage] = useState<string>("zh-CN");
	const [targetLanguage, setTargetLanguage] = useState<string>("en");
	const [options, setOptions] = useState<{ label: string; value: string }[]>([]);

	useEffect(() => {
		(async () => {
			try {
				const local = await invoke<string>(EVENT_NAMES.get_local_language as any);
				const target = await invoke<string>(EVENT_NAMES.get_target_language as any);
				const remoteOptions = await invoke<any>(EVENT_NAMES.get_language_options as any);
				if (Array.isArray(remoteOptions)) {
					setOptions(remoteOptions.map((r: any) => ({ label: r[1], value: r[0] })));
				}
				if (local) setLocalLanguage(local);
				if (target) setTargetLanguage(target);
			} catch (e) {
				// ignore
			}
		})();
	}, []);

	return (
		<div className="px-2 pb-2 flex  flex-wrap">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button size="xs" variant="ghost">
						Local: {options.find((item) => item.value === localLanguage)?.label ?? "Chinese"}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent side="top" align="start">
					{options.map((item) => (
						<DropdownMenuItem
							key={item.value}
							onSelect={async () => {
								await invoke(EVENT_NAMES.set_local_language as any, { language: item.value });
								setLocalLanguage(item.value);
							}}
						>
							{item.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
			<Button size="icon-xs" variant="ghost" disabled>
				<IIExchange />
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button size="xs" variant="ghost">
						Target: {options.find((item) => item.value === targetLanguage)?.label ?? "English"}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent side="top" align="start">
					{options.map((item) => (
						<DropdownMenuItem
							key={item.value}
							onSelect={async () => {
								await invoke(EVENT_NAMES.set_target_language as any, { language: item.value });
								setTargetLanguage(item.value);
							}}
						>
							{item.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
