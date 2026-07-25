import { type UIMessage } from "@tanstack/ai-react";

export function getMessageText(message: UIMessage) {
	return message.parts
		.map((part) => (part.type === "text" ? part.content : ""))
		.join("");
}
