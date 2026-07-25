import {
	type UIMessage,
	type TextPart,
	generateMessageId,
} from "@tanstack/ai/client";
import type { ChatMessage } from "@/lib/types";

export function chatMessageToUIMessage(msg: ChatMessage, id?: string): UIMessage {
	return {
		id: id ?? generateMessageId(),
		role: msg.role!,
		parts: [{ type: "text", content: msg.raw ?? msg.content } as TextPart],
	};
}

export function uiMessageToChatMessage(msg: UIMessage): UIMessage {
	return msg
}

/** Convert an array of ChatMessages to ChatUIMessages. Uses index-based IDs for stability. */
export function chatMessagesToUIMessages(msgs: ChatMessage[]): UIMessage[] {
	return msgs.map((msg, index) => chatMessageToUIMessage(msg, `msg-${index}`));
}

