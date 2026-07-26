import { useStore } from "@tanstack/react-store";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import Copyed from "@/components/Copyed";
import { EVENT_NAMES, useInvoke } from "@/lib/events";
import { type ChatMessage } from "@/lib/types";
import { cn, speak } from "@/lib/utils";
import { s_Selected } from "@/store";
import { Icons } from "@/components/icon";
import { PromptTags } from "@/components/PromptTags";

export function SelectedText({ onChat }: { onChat: (e: ChatMessage) => void }) {
	const selected = useStore(s_Selected, (state) => state);
	const { ...loadingChat_X } = useInvoke<boolean>(EVENT_NAMES.get_chatting_state, false, false, undefined, EVENT_NAMES.CHATTING_STATE_CHANGE);
	const { state: promptTags, invokeState: refreshPromptTags } = useInvoke<ChatMessage[]>(EVENT_NAMES.get_prompt_tags, []);

	const handleDeletePromptTag = async (id: number) => {
		await invoke<ChatMessage[]>(EVENT_NAMES.delete_prompt_tag, { id });
		await refreshPromptTags();
	};

	const handleAddPromptTag = async (label: string, content: string) => {
		await invoke<ChatMessage[]>(EVENT_NAMES.add_prompt_tag, { label, content });
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
						s_Selected.setState(() => ({ text: "" }))
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
								onChat({ raw: selected.text, label: e.label, content: e.content, id: e.id, });
							}}
						>
							{e.label}
						</Button>
					))}
					<PromptTags prompts={promptTags} onDelete={handleDeletePromptTag} onAdd={handleAddPromptTag} />
				</div>
			)
			}
		</div >
	);
}
