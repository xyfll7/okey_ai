import { useState } from "react";
import { flushSync } from "react-dom";
import { useStore } from "@tanstack/react-store";
import { invoke } from "@tauri-apps/api/core";
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
import { EVENT_NAMES, useInvoke } from "@/lib/events";
import { getModelProviderShowName } from "@/lib/types";
import { cn } from "@/lib/utils";
import { s_Selected } from "@/store";
import { Icons } from "@/components/icon";
import { m } from "@/paraglide/messages.js";
import type { ModelConfigMap, } from "@/@types";
import { useChatContext } from "@/components/chat/chatContext";
import { SelectedText } from "./SelectedText";

export function Inputer({ className, }: { className?: string; }) {
	const [value, setValue] = useState("");
	const selected = useStore(s_Selected, (state) => state);

	const { sendMessage } = useChatContext();

	const { ...modelsList_X } = useInvoke<ModelConfigMap>(EVENT_NAMES.list_available_models, {});
	const { ...currentModel_X } = useInvoke<string>(EVENT_NAMES.get_current_model, "");
	const currentModel = currentModel_X.state;
	const { ...loadingChat_X } = useInvoke<boolean>(EVENT_NAMES.get_chatting_state, false, false, undefined, EVENT_NAMES.CHATTING_STATE_CHANGE);
	return (<>
		<InputGroup className={cn(className, "rounded-xl", "has-[[data-slot=input-group-control]:focus-visible]:border-ring/70 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/7")}>
			{selected.text && (
				<InputGroupAddon align="block-start">
					<SelectedText onChat={(e) => {
						console.log("eee", e)
						invoke<string>(EVENT_NAMES.assemble_prompt,{  prompt_tag: e}).then((e) => {
							sendMessage(e)
						});
					}} />
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

						sendMessage(value)
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
						sendMessage(value)
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
