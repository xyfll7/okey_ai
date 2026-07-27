import Markdown from "markdown-to-jsx/react"
import {
	Bubble,
	BubbleContent,
	BubbleGroup,
	BubbleReactions,
} from "@/components/ui/bubble"
import type { UIMessage } from "@tanstack/ai-react"
import { getMessageText } from "@/components/chat/chatUtils"
import { Message, MessageContent, MessageHeader } from "@/components/ui/message"

export function MessageBubble({ message }: { message: UIMessage }) {
	return (
		<Message align={message.role === "user" ? "end" : "start"}>
			<MessageContent>
				{!(message.role === "user") && <MessageHeader>{"123213"}</MessageHeader>}
				<BubbleGroup>
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
			</MessageContent>
		</Message>
	)
}
