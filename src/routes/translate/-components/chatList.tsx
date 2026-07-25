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
import { useChatContext } from "@/components/chat/chatContext"
import { getMessageText } from "@/components/chat/getMessageText"
import { m } from "@/paraglide/messages.js"
import { Button } from "@base-ui/react"



export function ChatList() {
    const { messages, status, sendMessage } = useChatContext()
    const msg = messages.filter(e => e.role != "system")
    const isBusy = status === "submitted" || status === "streaming"
    console.log("sdfasdf", status,)

    return (
        <MessageScrollerProvider >
            <div>
                <Button onClick={() => { sendMessage("123123") }}>fasdf</Button>
            </div>
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
