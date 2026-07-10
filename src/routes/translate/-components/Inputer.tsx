import { useState } from "react";
import { flushSync } from "react-dom";
import { useStore } from "@tanstack/react-store";
import { invoke } from "@tauri-apps/api/core";
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
import Copyed from "@/components/Copyed";
import { EVENT_NAMES, useInvoke } from "@/lib/events";
import { getModelProviderShowName, type ChatMessage } from "@/lib/types";
import { cn, speak } from "@/lib/utils";
import { handleStream, s_Selected } from "@/store";
import { Icons } from "@/components/icon";
import { m } from "@/paraglide/messages.js";
import type { ModelConfigMap, PromptTag } from "@/@types";
import { Prompts } from "@/components/Prompts";

function SelectedText({ onHandleStream }: { onHandleStream: (chatMessage: ChatMessage) => Promise<void> }) {
	const selected = useStore(s_Selected, (state) => state);
	const { ...loadingChat_X } = useInvoke<boolean>(EVENT_NAMES.get_chatting_state, false, false, undefined, EVENT_NAMES.CHATTING_STATE_CHANGE);
	const { state: promptTags, invokeState: refreshPromptTags } = useInvoke<PromptTag[]>(EVENT_NAMES.get_prompt_tags, []);

	const handleDeletePromptTag = async (id: number) => {
		await invoke<PromptTag[]>(EVENT_NAMES.delete_prompt_tag, { id });
		await refreshPromptTags();
	};

	const handleAddPromptTag = async (label: string, content: string) => {
		await invoke<PromptTag[]>(EVENT_NAMES.add_prompt_tag, { label, content });
		await refreshPromptTags();
	};
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
				{promptTags.map((e) => (
					<Button
						className="mr-1 mb-1"
						size={"xs"}
						variant={"outline"}
						key={e.id}
						disabled={loadingChat_X.state}
						onClick={() => {
							void onHandleStream({
								role: "user",
								content: `${selected.text}\n${e.content}`,
								raw: selected.text,
							} as ChatMessage);
						}}
					>
						{e.label}
					</Button>
				))}
					<Prompts prompts={promptTags} onDelete={handleDeletePromptTag} onAdd={handleAddPromptTag} />
				</div>
			)
			}
		</div >
	);
}

export function Inputer({ className }: { className?: string; }) {
	const [value, setValue] = useState("");
	const selected = useStore(s_Selected, (state) => state);


	const { ...modelsList_X } = useInvoke<ModelConfigMap>(EVENT_NAMES.list_available_models, {});
	const { ...currentModel_X } = useInvoke<string>(EVENT_NAMES.get_current_model, "");
	const currentModel = currentModel_X.state;
	const { ...loadingChat_X } = useInvoke<boolean>(EVENT_NAMES.get_chatting_state, false, false, undefined, EVENT_NAMES.CHATTING_STATE_CHANGE);
	return (<>
		<InputGroup className={cn(className, "rounded-xl", "has-[[data-slot=input-group-control]:focus-visible]:border-ring/70 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/7")}>
			{selected.text && (
				<InputGroupAddon align="block-start">
					<SelectedText onHandleStream={handleStream} />
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
					if (!value.trim()) return;
					setValue("");
					await handleStream({ role: "user", content: value } as ChatMessage)
				}
					if (e.key === "Enter" && e.shiftKey) {
						e.preventDefault();
						const target = e.target as HTMLTextAreaElement;
						const start = target.selectionStart;
						const end = target.selectionEnd;
						const newValue = `${value.substring(0, start)}\n${value.substring(end)}`;
						flushSync(() => {
							setValue(newValue);
						});
						target.selectionStart = target.selectionEnd = start + 1;
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
					if (!value.trim()) return;
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
