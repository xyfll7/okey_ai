import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { type as ostype } from "@tauri-apps/plugin-os";
import { computePosition, flip, offset, shift } from "@floating-ui/dom";
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
import { handleStream, s_ChatList, s_Selected, s_StreamingContent } from "@/store";
import { Icons } from "@/components/icon";
import { HistoriesNew } from "@/components/HistoriesNew";
import { SettingsNew } from "@/components/SettingsNew";
import { m } from "@/paraglide/messages.js";
import type { ModelConfigMap } from "@/@types";
import { PromptTags } from "@/components/PromptTags";
import MessageNavigator from "@/components/MessageNavigator";
import { Card, CardContent } from "@/components/ui/card";

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
			<div className="relative h-full flex-coh">
				<ScrollArea className="h-full flex-coh">
					<ChatList className="px-2 pt-2" />
				</ScrollArea>
				<MessageNavigator />
			</div>
			<div className="px-2 pb-2">
				<Inputer />
			</div>
			<LanguageSelector />
			<SelectionFloatingButton />
		</div>
	);
}

function CreateNewSession() {
	const { ...loadingChat_X } = useInvoke<boolean>(EVENT_NAMES.get_chatting_state, false, false, undefined, EVENT_NAMES.CHATTING_STATE_CHANGE);
	return <Button size={"icon-sm"} variant={"ghost"} disabled={loadingChat_X.state} onClick={async () => {
		await invoke(EVENT_NAMES.create_new_session);
		const history = await invoke<ChatMessage[]>(EVENT_NAMES.get_current_history);
		s_ChatList.setState(() => history);
		s_Selected.setState(() => ({ text: "", raw: "" }));
	}}>
		<Icons.chat />
	</Button>;
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
					<Icons.x />
				</Button>
			</div>
		</div>
	);
}

/**
 * Range.getBoundingClientRect() can be unreliable right at a soft
 * line-wrap boundary: getClientRects() may include a zero-width/height
 * phantom rect trailing the previous visual line, and
 * getBoundingClientRect() unions it into the box, stretching it back
 * across the wrap and throwing off positioning. Filter those out and
 * union only the real (non-zero-area) rects instead.
 */
function getSelectionRect(range: Range): DOMRect {
	const rects = Array.from(range.getClientRects()).filter(
		(r) => r.width > 0 && r.height > 0,
	);
	if (rects.length === 0) {
		return range.getBoundingClientRect();
	}
	const top = Math.min(...rects.map((r) => r.top));
	const left = Math.min(...rects.map((r) => r.left));
	const right = Math.max(...rects.map((r) => r.right));
	const bottom = Math.max(...rects.map((r) => r.bottom));
	return new DOMRect(left, top, right - left, bottom - top);
}

/**
 * Floating quick-action button that appears above the current mouse text
 * selection, positioned with @floating-ui/dom against a virtual reference
 * element derived from the selection Range. This is purely additive: it
 * doesn't touch s_Selected or replace the existing per-message mouseup
 * selection handling — it just offers a "speak this selection" shortcut
 * right where the selection is.
 */
function SelectionFloatingButton() {
	const buttonRef = useRef<HTMLButtonElement>(null);
	const [visible, setVisible] = useState(false);
	const [coords, setCoords] = useState({ x: 0, y: 0 });
	const pendingTextRef = useRef<string>("");

	useEffect(() => {
		function hide() {
			setVisible(false);
			pendingTextRef.current = "";
		}

		function handleMouseUp(e: MouseEvent) {
			// Ignore clicks on the floating button itself.
			if (buttonRef.current?.contains(e.target as Node)) return;

			const selection = window.getSelection();
			const text = selection?.toString().trim();
			if (!selection || !text || selection.rangeCount === 0) {
				hide();
				return;
			}

			const range = selection.getRangeAt(0);
			pendingTextRef.current = text;

			const virtualEl = {
				getBoundingClientRect: () => getSelectionRect(range),
			};

			if (!buttonRef.current) return;
			computePosition(virtualEl, buttonRef.current, {
				placement: "top",
				strategy: "fixed",
				middleware: [
					offset(8),
					flip({ padding: 48 }),
					shift({ padding: 8 }),
				],
			}).then(({ x, y }) => {
				setCoords({ x, y });
				setVisible(true);
			});
		}

		function handleSelectionChange() {
			const selection = window.getSelection();
			if (!selection || !selection.toString().trim()) {
				hide();
			}
		}

		function handleScroll() {
			hide();
		}

		document.addEventListener("mouseup", handleMouseUp);
		document.addEventListener("selectionchange", handleSelectionChange);
		document.addEventListener("scroll", handleScroll, true);
		return () => {
			document.removeEventListener("mouseup", handleMouseUp);
			document.removeEventListener("selectionchange", handleSelectionChange);
			document.removeEventListener("scroll", handleScroll, true);
		};
	}, []);

	return (
		<Button
			ref={buttonRef}
			size="icon-sm"
			variant="default"
			className="fixed z-50 rounded-full shadow-md transition-opacity"
			style={{
				left: coords.x,
				top: coords.y,
				opacity: visible ? 1 : 0,
				pointerEvents: visible ? "auto" : "none",
			}}
			onClick={() => {
				if (pendingTextRef.current) {
					speak(pendingTextRef.current);
				}
				setVisible(false);
				pendingTextRef.current = "";
			}}
		>
			<Icons.volumeHigh />
		</Button>
	);
}

function SearchResultCard({ searchText, onClose }: { searchText: string; onClose: () => void }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const isMouseInsideRef = useRef<boolean>(false);

	function extractSelectedText() {
		if (!isMouseInsideRef.current) return;

		const selection = window.getSelection();
		const selectedText = selection?.toString().trim();

		if (selectedText) {
			if (selection && containerRef.current) {
				const range = selection.getRangeAt(0);
				if (containerRef.current.contains(range.commonAncestorContainer)) {
					s_Selected.setState(() => ({
						text: selectedText,
						raw: searchText,
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
	}

	return (
		<div className="pb-2">
			<Card
				ref={containerRef}
				className="relative --card-spacing:--spacing(2)"
				size="sm"
				onMouseUp={extractSelectedText}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
			>
				<Button
					size="icon-xs"
					variant="ghost"
					className="absolute top-0 right-0"
					onClick={(e) => {
						e.preventDefault();
						onClose();
					}}
				>
					<Icons.x />
				</Button>
				<CardContent>
					<p>
						{searchText}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

function Inputer({ className }: { className?: string; }) {
	const [value, setValue] = useState("");
	const selected = useStore(s_Selected, (state) => state);


	const { ...modelsList_X } = useInvoke<ModelConfigMap>(EVENT_NAMES.list_available_models, {});
	const { ...currentModel_X } = useInvoke<string>(EVENT_NAMES.get_current_model, "");
	const currentModel = currentModel_X.state;
	const { ...loadingChat_X } = useInvoke<boolean>(EVENT_NAMES.get_chatting_state, false, false, undefined, EVENT_NAMES.CHATTING_STATE_CHANGE);
	const [searchText, setSearchText] = useState("");
	return (<>
		{searchText &&
			<SearchResultCard searchText={searchText} onClose={() => setSearchText("")} />
		}
		<InputGroup className={cn(className, "rounded-xl", "has-[[data-slot=input-group-control]:focus-visible]:border-ring/70 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/7")}>
			{selected.text && (
				<InputGroupAddon align="block-start">
					<SelectedText onHandleStream={handleStream} onSearching={(e) => { setSearchText(e) }} />
				</InputGroupAddon>
			)}
			<InputGroupTextarea
				placeholder={m.translate_input_placeholder()}
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={async (e) => {
					if (loadingChat_X.state) {
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
					<DropdownMenuTrigger asChild disabled={loadingChat_X.state}>
						<InputGroupButton variant="ghost">{getModelProviderShowName()[currentModel as keyof ReturnType<typeof getModelProviderShowName>]}</InputGroupButton>
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
									await currentModel_X.setState(() => key)
								}} key={key}>{getModelProviderShowName()[key as keyof ReturnType<typeof getModelProviderShowName>]}</DropdownMenuItem>
							))}
					</DropdownMenuContent>
				</DropdownMenu>

				<InputGroupButton
					variant="default"
					className="rounded-full ml-auto cursor-pointer"
					size="icon-xs"
					onClick={async () => {
						if (loadingChat_X.state) {
							await invoke(EVENT_NAMES.abort_chat_stream);
							return;
						}
						setValue("");
						await handleStream({ role: "user", content: value } as ChatMessage)
					}}
				>
					{loadingChat_X.state ? <Icons.stop /> : <Icons.arrowUp />}
					<span className="sr-only">{loadingChat_X.state ? "abort" : "send"}</span>
				</InputGroupButton>
			</InputGroupAddon>
		</InputGroup>
	</>
	);
}

function ChatList({ className }: { className?: string; }) {
	const chatList = useStore(s_ChatList, (state) => state.filter((e) => e.role !== "system"));
	const streamingContent = useStore(s_StreamingContent, (state) => state);
	const { ...loadingChat_X } = useInvoke<boolean>(EVENT_NAMES.get_chatting_state, false, false, undefined, EVENT_NAMES.CHATTING_STATE_CHANGE);


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
			{!streamingContent && loadingChat_X.state && <div className="px-2.5" ><span data-loading="...">...</span></div>}
			{<StreamingMessage content={streamingContent} />}

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
		<div className={cn("px-2.5 mb-2 w-full", "min-h-30")}>
			<Markdown className="mb-2">{displayed}</Markdown>
		</div>
	);
}, (prev, next) => prev.content === next.content);

const MessageItem = React.memo(function MessageItem({ chat, className, index }: { chat: ChatMessage, className?: string, index: number }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const isMouseInsideRef = useRef<boolean>(false);

	function extractSelectedText() {
		if (!isMouseInsideRef.current) return;

		const selection = window.getSelection();
		const selectedText = selection?.toString().trim();

		if (selectedText) {
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
						<Icons.volumeHigh />
					</Button>
				</div>
			</div>
		</div>
	);
}, (prev, next) => prev.chat.content === next.chat.content && prev.chat.raw === next.chat.raw);

function SelectedText({ onHandleStream, onSearching }: { onSearching: (e: string) => void; onHandleStream: (chatMessage: ChatMessage) => Promise<void> }) {
	const selected = useStore(s_Selected, (state) => state);
	const { ...loadingChat_X } = useInvoke<boolean>(EVENT_NAMES.get_chatting_state, false, false, undefined, EVENT_NAMES.CHATTING_STATE_CHANGE);
	if (!selected.text) return "";
	return (
		<div className="w-full">
			<div className="w-full flex items-center mb-1">
				<div className="max-w-full truncate overflow-hidden">
					<span className={cn("mr-1")}>{selected.text}</span>
				</div>
				{selected.text?.trim() && (
					<Button size={"icon-sm"} variant={"ghost"} onClick={() => onSearching(selected.text ?? "")}>
						<Icons.searching />
					</Button>
				)}
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
						<Icons.volumeHigh />
					</Button>
				)}
				{selected.text?.trim() && (
					<Button size={"icon-sm"} variant={"ghost"} onClick={() => {
						s_Selected.setState(() => ({ text: "", raw: "" }))
					}}>
						<Icons.x />
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
							disabled={loadingChat_X.state}
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
					<PromptTags />
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
			<Icons.pin
				className={cn(pin_X.state && "text-green-300 dark:text-green-20")}
			/>
		</Button>
	);
}


export default function LanguageSelector() {
	const [localLanguage, setLocalLanguage] = useState<string>("zh-CN");
	const [targetLanguage, setTargetLanguage] = useState<string>("en");
	const [options, setOptions] = useState<{ label: string; value: string }[]>([]);
	const { ...selfExplaining_X } = useInvoke<boolean>(EVENT_NAMES.get_self_explaining_model, false);

	const localLanguageLabel = options.find((item) => item.value === localLanguage)?.label || localLanguage;
	const targetLanguageLabel = options.find((item) => item.value === targetLanguage)?.label || targetLanguage;

	useEffect(() => {
		(async () => {
			try {
				const local = await invoke<string>(EVENT_NAMES.get_local_language);
				const target = await invoke<string>(EVENT_NAMES.get_target_language);
				const remoteOptions = await invoke<[string, string][]>(EVENT_NAMES.get_language_options);
				if (Array.isArray(remoteOptions)) {
					setOptions(remoteOptions.map((r) => ({ label: r[1], value: r[0] })));
				}
				if (local) setLocalLanguage(local);
				if (target) setTargetLanguage(target);
			} catch {
				// ignore
			}
		})();
	}, []);

	return (
		<div className="px-2 pb-2 flex  flex-wrap">
			<Tooltip>
				<TooltipTrigger asChild>
					<Button size="icon-xs" variant="ghost" >
						<Icons.question />
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<div>
						{m.translate_language_selector_tooltip_line1({ localLanguage: localLanguageLabel })}
					</div>
					<div>
						{m.translate_language_selector_tooltip_line2({ localLanguage: localLanguageLabel, targetLanguage: targetLanguageLabel })}
					</div>
				</TooltipContent>
			</Tooltip>

			<DropdownMenu>
				<DropdownMenuTrigger asChild disabled={!!selfExplaining_X.state}>
					<Button size="xs" variant="ghost">
						{options.find((item) => item.value === localLanguage)?.label}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent side="top" align="start">
					{options.map((item) => (
						<DropdownMenuItem
							key={item.value}
							onSelect={async () => {
								await invoke(EVENT_NAMES.set_local_language, { language: item.value });
								setLocalLanguage(item.value);
							}}
						>
							{item.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
			<Button size="icon-xs" variant="ghost" disabled>
				<Icons.exchange />
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger asChild disabled={!!selfExplaining_X.state}>
					<Button size="xs" variant="ghost">
						{options.find((item) => item.value === targetLanguage)?.label}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent side="top" align="start">
					{options.map((item) => (
						<DropdownMenuItem
							key={item.value}
							onSelect={async () => {
								await invoke(EVENT_NAMES.set_target_language, { language: item.value });
								setTargetLanguage(item.value);
							}}
						>
							{item.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
			<Button
				size="xs"
				variant="ghost"
				className={cn(
					selfExplaining_X.state ? "" : "opacity-50",
					"hover:text-inherit",
				)}
				onClick={async () => {
					const enabled = !selfExplaining_X.state;
					await invoke(EVENT_NAMES.set_self_explaining_model, { enabled });
					selfExplaining_X.setState(enabled);
				}}
			>
				{selfExplaining_X.state ? m.translate_language_selector_self_explaining_on() : m.translate_language_selector_self_explaining_off()}
			</Button>
		</div>
	);
}