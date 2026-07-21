import { stream } from "@tanstack/ai-react";
import {
	type UIMessage,
	type TextPart,
	generateMessageId,
} from "@tanstack/ai/client";
import type { ChatMessage } from "@/lib/types";



/**
 * Extended UIMessage that carries the original ChatMessage's `raw` and
 * `content` fields so we can round-trip between the two representations
 * without losing data needed by MessageItem (raw for display, content for copy).
 */
export type ChatUIMessage = UIMessage & {
	raw?: string;
	content: string;
};

/** Convert a ChatMessage (app-level) to a ChatUIMessage (useChat-level). */
export function chatMessageToUIMessage(msg: ChatMessage, id?: string): ChatUIMessage {
	return {
		id: id ?? generateMessageId(),
		role: msg.role!,
		parts: [{ type: "text", content: msg.raw ?? msg.content } as TextPart],
		raw: msg.raw,
		content: msg.content!,
	};
}

/** Convert a ChatUIMessage back to a ChatMessage for rendering. */
export function uiMessageToChatMessage(msg: UIMessage): ChatMessage {
	const textPart = msg.parts.find((p): p is TextPart => p.type === "text");
	const text = textPart?.content ?? "";
	const extra = msg as ChatUIMessage;
	return {
		role: msg.role,
		content: extra.content ?? text,
		raw: extra.raw,
	};
}

/** Convert an array of ChatMessages to ChatUIMessages. Uses index-based IDs for stability. */
export function chatMessagesToUIMessages(msgs: ChatMessage[]): ChatUIMessage[] {
	return msgs.map((msg, index) => chatMessageToUIMessage(msg, `msg-${index}`));
}

/** Convert an array of UIMessages back to ChatMessages (filtering system). */
export function uiMessagesToChatMessages(msgs: UIMessage[]): ChatMessage[] {
	return msgs.filter((m) => m.role !== "system").map(uiMessageToChatMessage);
}

/**
 * No-op connection adapter. `useChat` requires a `connection` or `fetcher`,
 * but we only use `setMessages` for message management — streaming is handled
 * externally via `handleStream`. This adapter is never actually invoked.
 */
export const noopConnection = stream(async function* () {});
