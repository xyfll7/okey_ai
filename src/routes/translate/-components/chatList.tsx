
import { type UIMessage } from "@tanstack/ai-react"
import {
    MessageCircleDashedIcon,
} from "lucide-react"



import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"

import {
    MessageScroller,
    MessageScrollerButton,
    MessageScrollerContent,
    MessageScrollerItem,
    MessageScrollerProvider,
    MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { useChatContext } from "./chatContext"
import { m } from "@/paraglide/messages.js"



function getMessageText(message: UIMessage) {
    return message.parts
        .map((part) => (part.type === "text" ? part.content : ""))
        .join("")
}

export function ChatList() {
    const { messages, status } = useChatContext()
    const msg = messages.filter(e => e.role != "system")
    const isBusy = status === "submitted" || status === "streaming"
    return (
        <MessageScrollerProvider >
            {msg.length === 0 ? (
                <Empty className="h-full">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <MessageCircleDashedIcon />
                        </EmptyMedia>
                        <EmptyTitle>{m.translate_empty_title()}</EmptyTitle>
                        <EmptyDescription>
                            {m.translate_empty_description()}
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <MessageScroller className="">
                    <MessageScrollerViewport className="scrollbar-area">
                        <MessageScrollerContent
                            aria-busy={isBusy}
                            className="p-4 scroll-fade"
                        >
                            {msg.map((message) => (
                                <MessageScrollerItem key={message.id} scrollAnchor={message.role === "user"}>
                                    {getMessageText(message)}
                                </MessageScrollerItem>
                            ))}
                        </MessageScrollerContent>
                    </MessageScrollerViewport>
                    <MessageScrollerButton className="start-1/2" />
                </MessageScroller>
            )}


        </MessageScrollerProvider>
    )
}
