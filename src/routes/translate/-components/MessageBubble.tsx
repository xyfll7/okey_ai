import Markdown from "markdown-to-jsx/react"
import {
	Bubble,
	BubbleContent,
	BubbleGroup,
	BubbleReactions,
} from "@/components/ui/bubble"
import type { UIMessage } from "@tanstack/ai-react"
import { getMessageText } from "@/components/chat/chatUtils"

export function MessageBubble({
	scrollAnchor = false,
	messageId,
	message,
}: {
	message: UIMessage
	scrollAnchor?: boolean
	messageId?: string
}) {
	return (
		<BubbleGroup
			data-message-id={messageId}
			data-scroll-anchor={scrollAnchor ? "true" : "false"}>
			{message.role === "user" &&
				<>
					<Bubble variant={"outline"} align="end" >
						<BubbleContent>{getMessageText(message)}</BubbleContent>
					</Bubble>
				</>

			}
			{message.role === "assistant" &&
				<>
					<Bubble variant="ghost" >
						<BubbleContent>
							<Markdown className="mb-2">{getMessageText(message)}</Markdown>
						</BubbleContent>
						<BubbleReactions role="img" aria-label="Reaction: thumbs up">
							<span>👍</span>
						</BubbleReactions>
					</Bubble>
				</>

			}
		</BubbleGroup>

	)
}
