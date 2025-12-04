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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
export const Route = createFileRoute("/translate/")({
	component: RouteComponent,
});

function RouteComponent() {
	console.log("Render Translate Route:::", ostype());
	const [chatList, setChatList] = useState<
		{ from: "user" | "ai"; content: string; timestamp?: Date }[]
	>([
		{ from: "ai", content: "字符串化", timestamp: new Date() },
		{ from: "user", content: "响应", timestamp: new Date() },
		{ from: "ai", content: "响应", timestamp: new Date() },
		{ from: "user", content: "响应", timestamp: new Date() },
		{ from: "ai", content: "响应", timestamp: new Date() },
		{ from: "user", content: "响应", timestamp: new Date() },
		{ from: "ai", content: "响应", timestamp: new Date() },
		{ from: "user", content: "响应", timestamp: new Date() },
		{ from: "ai", content: "响应", timestamp: new Date() },
		{ from: "user", content: "响应", timestamp: new Date() },
		{ from: "ai", content: "响应", timestamp: new Date() },
		{ from: "user", content: "响应", timestamp: new Date() },
		{ from: "ai", content: "响应", timestamp: new Date() },
		{ from: "user", content: "响应", timestamp: new Date() },
		{ from: "ai", content: "响应", timestamp: new Date() },
		{ from: "user", content: "响应", timestamp: new Date() },
		{ from: "ai", content: "响应", timestamp: new Date() },
		{ from: "user", content: "响应", timestamp: new Date() },
		{ from: "ai", content: "响应", timestamp: new Date() },
	]);
	const [originalText, setOriginalText] = useState<string>("");
	const [selectedText, setSelectedText] = useState<string>("");
	useEffect(() => {
		const unlistenResponse = listen<{ content: string; selected_text: string }>(
			"ai-response",
			(event) => {
				setChatList((list) => [
					...list,
					{ from: "ai", content: event.payload.content, timestamp: new Date() },
				]);
				setOriginalText(event.payload.selected_text);
			},
		);

		const unlistenError = listen<string>("ai-error", (event) => {
			setChatList((list) => [
				...list,
				{ from: "ai", content: event.payload, timestamp: new Date() },
			]);
		});

		emit("page_loaded", { ok: true });
		return () => {
			unlistenResponse.then((fn) => fn());
			unlistenError.then((fn) => fn());
		};
	}, []);
	return (
		<div className="h-screen max-h-screen flex flex-col ">
			<Header className="" />
			<div className=" flex-1 bg-gray-700_   h-full flex flex-col overflow-hidden ">
				<div className="mb-2 h-full flex flex-col overflow-hidden">
					<ChatList chatList={chatList}></ChatList>
				</div>
				<div className="px-2 mb-2">
					<Button variant="secondary" size={"sm"} className="rounded-full">
						{selectedText ? selectedText : "..."}
					</Button>
				</div>
			</div>

			<div className="px-2">
				<InputGroup className="mb-2">
					<InputGroupTextarea
						placeholder="Ask, Search or Chat..."
						value={originalText}
						onChange={(e) => {
							setOriginalText(e.target.value);
						}}
						onMouseMove={(e) => {
							const target = e.target as HTMLTextAreaElement;
							const selectedText = target.value.substring(
								target.selectionStart,
								target.selectionEnd,
							);
							if (selectedText) {
								setSelectedText(selectedText);
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
				<Pin size={"1rem"} className={pin ? "" : "text-green-300 dark:text-green-200"} />
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

function ChatList({
	chatList,
}: {
	chatList: { from: "user" | "ai"; content: string; timestamp?: Date }[];
}) {
	return (
		<ScrollArea className="h-full pl-2 pr-4">
			<div className="space-y-4">
				{chatList.map((chat, index) => {
					const isUser = chat.from === "user";
					return (
						<div
							key={`chat-${chat.from}-${index}`}
							className={`flex ${isUser ? "justify-end" : "justify-start"}`}
						>
							<div
								className={`max-w-[80%] rounded-lg px-2 py-2 ${
									isUser
										? "bg-muted text-muted-foreground rounded-br-md"
										: "text-muted-foreground rounded-bl-md"
								}`}
							>
								<div className="text-sm">{chat.content}</div>
							</div>
						</div>
					);
				})}
			</div>
		</ScrollArea>
	);
}
