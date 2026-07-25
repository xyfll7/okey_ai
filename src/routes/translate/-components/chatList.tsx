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
import type {  RefObject } from "react"
import { useChatContext } from "@/components/chat/chatContext"
import { getMessageText } from "@/components/chat/chatUtils"
import { m } from "@/paraglide/messages.js"
import { Marker, MarkerContent } from "@/components/ui/marker"
import { cn } from "@/lib/utils"
import { MessageItem } from "./MessageItem"

export function ChatList({
    containerRef,
}: {
    containerRef?: RefObject<HTMLDivElement | null>
}) {
    const { messages, status, } = useChatContext()
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
                    <MessageScrollerViewport ref={containerRef} className="scrollbar-area">
                        <MessageScrollerContent
                            aria-busy={isBusy}
                            data-chat-container
                            className="p-4 scroll-fade"
                        >
                            {msg.map((message, index) => (
                                <MessageScrollerItem key={message.id} scrollAnchor={message.role === "user"} data-index={index}>
                                    <MessageItem>{getMessageText(message)}</MessageItem>
                                    {msg.length - 1 === index &&
                                        <Marker role="banner" className={cn(isBusy && !getMessageText(message).length ? "" : "sr-only")} >
                                            <MarkerContent className="shimmer">
                                                <span className="font-medium">loading</span>...
                                            </MarkerContent>
                                        </Marker>
                                    }
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
