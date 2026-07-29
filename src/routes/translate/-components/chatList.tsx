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
import { useRef, type MouseEvent } from "react"
import { useChatContext } from "@/components/chat/chatContext"
import { m } from "@/paraglide/messages.js"
import { MessageBubble, } from "./MessageBubble"
import { s_Selected } from "@/store"
import { Marker, MarkerContent } from "@/components/ui/marker"
import { cn } from "@/lib/utils"
import { getMessageText } from "@/components/chat/chatUtils"
import MessageNavigator from "@/components/MessageNavigator"
import { SelectionFloatingButton } from "./SelectionFloatingButton"
function handleChatSelection(e: MouseEvent<HTMLElement>) {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (e.currentTarget.contains(range.commonAncestorContainer)) {
        s_Selected.setState(() => ({ text }));
    }
}




export function ChatList() {
    const chatListRef = useRef<HTMLDivElement>(null);
    const { messages, status, } = useChatContext()
    const msg = messages.filter(e => e.role != "system")
    const isBusy = status === "submitted" || status === "streaming"
    return (
        <MessageScrollerProvider>
            <MessageNavigator />
            <SelectionFloatingButton containerRef={chatListRef} />
            {msg.length === 0 ? (
                <Empty className="h-full" onMouseUp={handleChatSelection}>
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
                <MessageScroller className="" onMouseUp={handleChatSelection}>
                    <MessageScrollerViewport ref={chatListRef} className="scrollbar-area">
                        <MessageScrollerContent
                            aria-busy={isBusy}
                            data-chat-container
                            className="p-4 scroll-fade "
                        >
                            {msg.map((item, index) => (
                                <MessageScrollerItem
                                    className="[content-visibility:visible!]"
                                    key={item.id}
                                    messageId={item.id}
                                    scrollAnchor={item.role === "user"} >
                                    <MessageBubble message={item} />
                                    {msg.length - 1 === index &&
                                        <Marker role="banner" className={cn(isBusy && !getMessageText(item).join("").length ? "" : "sr-only")} >
                                            <MarkerContent className="shimmer">
                                                <span className="font-medium">{m.translate_loading()}</span>...
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
