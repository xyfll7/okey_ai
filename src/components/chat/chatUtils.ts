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


/** Convert an array of ChatMessages to ChatUIMessages. Uses index-based IDs for stability. */
export function chatMessagesToUIMessages(msgs: ChatMessage[]): UIMessage[] {
	return msgs.map((msg, index) => chatMessageToUIMessage(msg, `msg-${index}`));
}


/** Extract the concatenated text content from a UIMessage's text parts. */
export function getMessageText(message: UIMessage) {
	return message.parts
		.map((part) => (part.type === "text" ? part.content : ""))
}

