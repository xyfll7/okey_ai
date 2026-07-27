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
    MessageScrollerProvider,
    MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import type { MouseEvent, RefObject } from "react"
import { useChatContext } from "@/components/chat/chatContext"
import { m } from "@/paraglide/messages.js"
import { MessageBubble, } from "./MessageBubble"
import { s_Selected } from "@/store"
import { Marker, MarkerContent } from "@/components/ui/marker"
import { cn } from "@/lib/utils"
import { getMessageText } from "@/components/chat/chatUtils"

function handleChatSelection(e: MouseEvent<HTMLElement>) {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (e.currentTarget.contains(range.commonAncestorContainer)) {
        s_Selected.setState(() => ({ text }));
    }
}

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
                            onMouseUp={handleChatSelection}
                            className="p-4 scroll-fade "
                        >
                            {msg.map((message, index) => (
                                <>
                                    <MessageBubble message={message} key={message.id} messageId={message.id} scrollAnchor={message.role === "user"} />
                                    {msg.length - 1 === index &&
                                        <Marker role="banner" className={cn(isBusy && !getMessageText(message).length ? "" : "sr-only")} >
                                            <MarkerContent className="shimmer">
                                                <span className="font-medium">loading</span>...
                                            </MarkerContent>
                                        </Marker>
                                    }
                                </>
                            ))}
                        </MessageScrollerContent>
                    </MessageScrollerViewport>
                    <MessageScrollerButton className="start-1/2" />
                </MessageScroller>
            )}


        </MessageScrollerProvider>
    )
}
