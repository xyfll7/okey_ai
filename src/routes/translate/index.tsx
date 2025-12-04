import { IconCheck, IconInfoCircle, IconPlus } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { ArrowUpIcon, Pin, Search, SearchIcon, X } from "lucide-react";
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
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
export const Route = createFileRoute("/translate/")({
	component: RouteComponent,
});

function RouteComponent() {
	const [aiResponse, setAiResponse] = useState<string | null>(null);
	const [originalText, setOriginalText] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		const unlistenResponse = listen<{ content: string; selected_text: string }>(
			"ai-response",
			(event) => {
				setAiResponse(event.payload.content);
				setOriginalText(event.payload.selected_text);
				setError(null);
			},
		);

		const unlistenError = listen<string>("ai-error", (event) => {
			setError(event.payload);
			setAiResponse(null);
			setOriginalText(null);
		});

		emit("page_loaded", { ok: true });
		return () => {
			unlistenResponse.then((fn) => fn());
			unlistenError.then((fn) => fn());
		};
	}, []);
	return (
		<div className=" h-screen  flex flex-col">
			<Header className="" />
			<div className="flex-1 bg-gray-700_"></div>
			<div className="px-2">
				{/* {originalText && (
					<div className="mt-4">
						<p className="mt-2 p-2  rounded">{originalText}</p>
					</div>
				)}
				{error ? (
					<div className="mt-4 p-2   rounded">
						<h2 className="font-semibold">Error:</h2>
						<p className="mt-2">{error}</p>
					</div>
				) : (
					<div className="mt-4">
						<p className="mt-2 p-2  rounded">{aiResponse}</p>
					</div>
				)} */}
				<div className="grid w-full max-w-sm gap-6">
					<InputGroup className="mb-2">
						<InputGroupTextarea placeholder="Ask, Search or Chat..."  onMouseMove={(e=> {
							console.log(e)
						})} />
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
	return (
		<div
			className={cn(
				"flex items-center justify-between ",
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
				<Pin size={"1rem"} className={pin ? "" : " text-green-200"} />
			</Button>
			<Button
				size={"icon-sm"}
				variant={"ghost"}
				className="opacity-70 hover:opacity-100 hover:bg-transparent dark:hover:bg-transparent"
				onClick={() => invoke("close_main_window")}
			>
				<X size={"1rem"} />
			</Button>
		</div>
	);
}
