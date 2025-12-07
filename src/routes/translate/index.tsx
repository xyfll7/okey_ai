import { IconPlus } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { type as ostype } from "@tauri-apps/plugin-os";
import { ArrowUpIcon, Pin, Volume2, VolumeOff, X } from "lucide-react";
import Markdown from "markdown-to-jsx";
import { useEffect, useRef, useState } from "react";
import { DIVButton } from "@/components/DIVButton";
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
	InputGroupText,
	InputGroupTextarea,
} from "@/components/ui/input-group";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { EVENT_NAMES } from "@/lib/events";
import type { InputData } from "@/lib/types";
import { cn, speak } from "@/lib/utils";

export const Route = createFileRoute("/translate/")({
	component: RouteComponent,
});

function RouteComponent() {
	const [chatList, setChatList] = useState<InputData[]>([]);
	const [selectedText, setSelectedText] = useState<string>("");
	useEffect(() => {
		const unlistenSpeak = listen<InputData>(
			EVENT_NAMES.AUTO_SPEAK,
			({ payload }) => {
				invoke<boolean>("get_auto_speak_state").then((res) => {
					setSelectedText(payload.input_text);
					res && speak(payload.input_text); 
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
				<ChatList chatList={chatList} onSelect={setSelectedText}></ChatList>
			</div>

			<div className="px-2">
				<Inputer
					selectedText={selectedText}
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
					onSelect={(e) => {
						setSelectedText(e);
					}}
				/>
			</div>
		</div>
	);
}

function Header(props: React.ComponentProps<"div">) {
	const [pin, setPin] = useState(false);
	const [autoSpeak, setAutoSpeak] = useState(false);
	useEffect(() => {
		invoke<boolean>("get_auto_close_window_state").then((res) => setPin(res));
		invoke<boolean>("get_auto_speak_state").then((res) => setAutoSpeak(res));
	}, []);
	const _ostype = ostype();

	const pinButton = (
		<Button
			size="icon-sm"
			variant="ghost"
			className="opacity-70 hover:opacity-100 hover:bg-transparent dark:hover:bg-transparent"
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
			<div>
				{_ostype === "windows" && pinButton}
				<Button
					size="icon-sm"
					variant="ghost"
					className=" opacity-70 hover:opacity-100 hover:bg-transparent dark:hover:bg-transparent"
					onClick={async () =>
						setAutoSpeak(await invoke<boolean>("toggle_auto_speak"))
					}
				>
					{autoSpeak ? <Volume2 size={"1rem"} /> : <VolumeOff size={"1rem"} />}
				</Button>
				{_ostype === "macos" && pinButton}
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

function Inputer({
	onEnter,
	onSelect,
	selectedText,
}: {
	onEnter: (message: string) => void;
	onSelect: (message: string) => void;
	selectedText?: string;
}) {
	const [value, setValue] = useState("");
	const extractSelectedText = (e: React.MouseEvent<HTMLTextAreaElement>) => {
		const target = e.target as HTMLTextAreaElement;
		const selectedText = target.value.substring(
			target.selectionStart,
			target.selectionEnd,
		);
		if (selectedText.trim()) {
			onSelect(selectedText.trim());
		}
	};
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
				onMouseUp={extractSelectedText}
				onMouseMove={extractSelectedText}
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
			<InputGroupAddon align="block-start" className=" flex">
				<div className="w-full [&_svg:not([class*='size-'])]:size-4 [&_svg]:cursor-pointer">
					<div className="w-full flex items-center">
						<div className="max-w-full truncate overflow-hidden">
							<span className={cn("mr-1", { "opacity-50": !selectedText })}>
								{selectedText ? selectedText : "用鼠标选中需要翻译的文本"}
							</span>
						</div>
						{selectedText?.trim() && (
							<Volume2
								className="inline translate-y-[0.8px] min-w-4  text-gray-500 hover:text-gray-700"
								onClick={() => {
									if (!selectedText) return;
									speak(selectedText);
								}}
							/>
						)}
					</div>

					{selectedText?.trim() && (
						<div className=" flex  flex-wrap">
							<KbdGroup className=" flex-wrap">
								{["单词详解", "在句中的含义"].map((i) => (
									<Kbd
										key={i}
										className="mt-1 cursor-pointer! mr-1 rounded-full pointer-events-auto text-nowrap"
									>
										{i}
									</Kbd>
								))}
							</KbdGroup>
						</div>
					)}
				</div>
			</InputGroupAddon>
			<InputGroupAddon align="block-end">
				<InputGroupButton
					variant="outline"
					className="rounded-full"
					size="icon-xs"
				>
					<IconPlus />
				</InputGroupButton>
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
				<InputGroupText className="ml-auto">52% used</InputGroupText>
				<Separator orientation="vertical" className="h-4!" />
				<InputGroupButton
					variant="default"
					className="rounded-full"
					size="icon-xs"
					disabled
				>
					<ArrowUpIcon />
					<span className="sr-only">Send</span>
				</InputGroupButton>
			</InputGroupAddon>
		</InputGroup>
	);
}

function ChatList({
	chatList,
	onSelect,
}: {
	chatList: InputData[];
	onSelect: (message: string) => void;
}) {
	const messagesEndRef = useRef<HTMLDivElement>(null);

	function extractSelectedText() {
		const selectedText = window.getSelection()?.toString().trim();
		if (selectedText) {
			onSelect(selectedText);
		}
	}

	useEffect(() => {
		void chatList;
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [chatList]);

	return (
		<ScrollArea className="h-full px-2">
			<div
				role="none"
				className="space-y-2 pt-2"
				onMouseUp={extractSelectedText}
				onMouseMove={extractSelectedText}
			>
				{chatList.map((chat, index) => {
					return (
						<div
							key={`chat-${chat.input_time_stamp}-${index}`}
							className={`flex w-full justify-start`}
						>
							<div className={cn("flex flex-col ", "items-start")}>
								<div
									className={`rounded-lg px-2 py-2 text-muted-foreground rounded-bl-md`}
								>
									<DIVButton
										asChild
										variant="ghost"
										size={"sm"}
										pointerEvents
										className="max-w-full [--radius:1rem] px-0! py-0 "
									>
										<div>
											<div>
												<span className="mr-1 ">{chat.input_text}</span>
												<Volume2
													className="inline translate-y-[-0.8px] text-gray-500 hover:text-gray-700"
													onClick={() => speak(chat.input_text)}
												/>
											</div>
										</div>
									</DIVButton>
									<div className="text-sm">
										{chat.response_text ? (
											<Markdown>{chat.response_text}</Markdown>
										) : (
											"..."
										)}
									</div>
								</div>
							</div>
						</div>
					);
				})}
				<div ref={messagesEndRef} />
			</div>
		</ScrollArea>
	);
}
