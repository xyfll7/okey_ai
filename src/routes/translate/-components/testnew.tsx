
import { useChat, type UIMessage } from "@tanstack/ai-react"
import {
    MessageCircleDashedIcon,
    RotateCwIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"


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
import { useEffect } from "react"
import { chatMessagesToUIMessages, chatMessageToUIMessage, } from "./chatConnection"
import { invoke } from "@tauri-apps/api/core"
import type { ChatMessage } from "@/lib/types"
import { EVENT_NAMES } from "@/lib/events"
// import { emit, listen } from "@tauri-apps/api/event"
// import { s_Selected } from "@/store";
import { createMockAdapter } from "./mockAdapter"



function getMessageText(message: UIMessage) {
    return message.parts
        .map((part) => (part.type === "text" ? part.content : ""))
        .join("")
}

export function TanStackAiHelperDemoNew() {
    const { messages, append, status, setMessages, sendMessage } = useChat({
        initialMessages: [],
        connection: createMockAdapter(),
    })
    useEffect(() => {
        invoke<ChatMessage[]>(EVENT_NAMES.get_current_history).then((history) => {
            setMessages(chatMessagesToUIMessages(history))
        })
    }, [setMessages])

    const isBusy = status === "submitted" || status === "streaming"
    return (
        <MessageScrollerProvider >
            <div className="flex items-center">
                <Button variant="outline" size="icon" aria-label="Reset conversation" onClick={() => setMessages([])} disabled={isBusy}><RotateCwIcon /></Button>
                <Button onClick={() => { sendMessage("123213") }}>111</Button>
                <Button onClick={() => {
                    const abc = chatMessageToUIMessage({
                        role: "user",
                        content: "你好啊",
                    })
                    append(abc)
                }}>你好啊</Button>
                <Button onClick={() => {
                    const abc = chatMessageToUIMessage({
                        role: "user",
                        content: "错误测试",
                    })
                    append(abc)
                }}>错误测试</Button>
            </div>
            {messages.length === 0 ? (
                <Empty className="h-full">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <MessageCircleDashedIcon />
                        </EmptyMedia>
                        <EmptyTitle>Morning, shadcn!</EmptyTitle>
                        <EmptyDescription>
                            What are we working on today? Press send to start a new
                            conversation
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
                            {messages.map((message) => (
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
