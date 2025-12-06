import { IconPlus } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { type as ostype } from "@tauri-apps/plugin-os";
import { ArrowUpIcon, Pin, X } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import type { InputData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChatList } from "./components/ChatList";
export const Route = createFileRoute("/translate/")({
	component: RouteComponent,
});

function RouteComponent() {
	const [chatList, setChatList] = useState<InputData[]>([]);

	const [selectedText, setSelectedText] = useState<string>("");
	useEffect(() => {
		const unlistenResponse = listen<InputData>("ai_response", ({ payload }) => {
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
		});

		const unlistenError = listen<string>("ai-error", (event) => {
			// Handle error by adding an error message to the chat list
			const errorPayload: InputData = {
				input_time_stamp: Date.now().toString(),
				input_text: "Error occurred",
				response_text: event.payload,
			};
			setChatList((list) => [...list, errorPayload]);
		});

		emit("page_loaded", { ok: true });
		return () => {
			unlistenResponse.then((fn) => fn());
			unlistenError.then((fn) => fn());
		};
	}, []);
	return (
		<div className="h-screen max-h-screen max-w-screen flex-coh">
			<Header className="" />
			<div className="mb-2 h-full flex-coh">
				<ChatList chatList={chatList} onSelect={setSelectedText}></ChatList>
			</div>
			<div className="px-2 mb-2">
				<Button
					variant="secondary"
					size={"sm"}
					className="rounded-full max-w-1/4 "
				>
					<span className="truncate">
						{selectedText ? selectedText : "..."}
					</span>
				</Button>
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
	useEffect(() => {
		invoke<boolean>("get_auto_close_window_state").then((res) => {
			setPin(res);
		});
	}, []);
	const _ostype = ostype();
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
}: {
	onEnter: (message: string) => void;
	onSelect: (message: string) => void;
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
		<InputGroup className="mb-2">
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
