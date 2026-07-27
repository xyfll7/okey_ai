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
// import { MessageScrollerGroupChat } from "./Test"
import { createChat } from "@shadcn/helpers/ai-sdk"
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


createChat()
  .user(
    "I'm building a chat for our app and the scroll behavior is driving me nuts. Every time the AI streams a reply, the whole thread jumps around."
  )
  .sleep(1000)
  .assistant(({ writer }) => {
    writer.reasoning(
      "They are describing a streaming transcript that keeps taking control of the viewport. I should explain when auto-scroll follows and when it stops."
    )
    writer.sleep(1000)
    writer.text(
      "That's the classic streaming scroll problem. Wrap your message list in `MessageScroller` and turn on `autoScroll` — the viewport pins to the bottom as tokens arrive, so users always see the latest text land in place.\n\nThe important part: it only auto-scrolls while the reader is already at the bottom. The moment they scroll up to read something earlier, auto-scroll backs off and their position is preserved. You get smooth streaming without fighting the user's intent."
    )
  })

export function ChatList() {
    const chatListRef = useRef<HTMLDivElement>(null);
    const { messages, status, } = useChatContext()
    const msg = messages.filter(e => e.role != "system")
    const isBusy = status === "submitted" || status === "streaming"
    return (
        <MessageScrollerProvider >
            <MessageNavigator />
            <SelectionFloatingButton containerRef={chatListRef} />
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
                    <MessageScrollerViewport ref={chatListRef} className="scrollbar-area">
                        <MessageScrollerContent
                            aria-busy={isBusy}
                            data-chat-container
                            onMouseUp={handleChatSelection}
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
                                        <Marker role="banner" className={cn(isBusy && !getMessageText(item).length ? "" : "sr-only")} >
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
