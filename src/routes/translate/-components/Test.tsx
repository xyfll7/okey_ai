import * as React from "react"
import { Bubble, BubbleContent, BubbleReactions } from "@/components/ui/bubble"
import {
    Message,
    MessageContent,
    MessageHeader,
} from "@/components/ui/message"
import {
    MessageScrollerItem,
} from "@/components/ui/message-scroller"

const currentUser = "Grace"

const initialItems = [
    {
        id: "group-1",
        type: "message",
        sender: "Grace",
        role: "participant",
        text: "@mary, the astrophage line keeps matching Venus energy output. Can you check my math?",
    },
    {
        id: "group-2",
        type: "message",
        sender: "Mary (Agent)",
        role: "assistant",
        text: "Yes. Confirmed. The curve points to a microorganism harvesting stellar energy and breeding near carbon dioxide. If @rocky agrees, this is the clue we need.",
    },
    {
        id: "group-3",
        type: "message",
        sender: "Grace",
        role: "participant",
        text: "ping @rocky",
        scrollAnchor: true,
    },
] satisfies GroupChatItem[]

const rockyMarker = {
    id: "group-4",
    type: "event",
    text: "Rocky has joined the chat",
    scrollAnchor: true,
} satisfies GroupChatItem

const rockyMessage = {
    id: "group-5",
    type: "message",
    sender: "Rocky",
    role: "participant",
    text: "Amaze. Astrophage eats light, makes heat, goes to carbon dioxide. Rocky has fuel model. Grace is smart.",
} satisfies GroupChatItem

type GroupChatItem =
    | {
        id: string
        type: "event"
        text: string
        scrollAnchor?: boolean
    }
    | {
        id: string
        type: "message"
        sender: string
        role: "assistant" | "participant"
        text: string
        scrollAnchor?: boolean
    }

export function MessageScrollerGroupChat() {
    const [rockyTurn] = React.useState<
        "idle" | "marker" | "message"
    >("idle")
    const items =
        rockyTurn === "message"
            ? [...initialItems, rockyMarker, rockyMessage]
            : rockyTurn === "marker"
                ? [...initialItems, rockyMarker]
                : initialItems
    return (
        <>
            {items.map((item) =>
                <GroupChatMessage key={item.id} item={item as Extract<GroupChatItem, { type: "message" }>} />
            )}
        </>
    )
}

function GroupChatMessage({
    item,
}: {
    item: Extract<GroupChatItem, { type: "message" }>
}) {
    const isCurrentUser = item.sender === currentUser
    const variant = isCurrentUser
        ? "muted"
        : item.role === "assistant"
            ? "ghost"
            : "tinted"
        
    return (
         <MessageScrollerItem messageId={item.id} scrollAnchor={item.scrollAnchor} className="[content-visibility:visible!]">
           <Message align={isCurrentUser ? "end" : "start"}>
                 <MessageContent>
              {!isCurrentUser && <MessageHeader>;;;{item.sender}</MessageHeader>}
                    <Bubble variant={variant}>
                        <BubbleContent>{item.text}</BubbleContent>
                        <BubbleReactions role="img" aria-label="Reaction: thumbs up">
                            <span>👍</span>
                        </BubbleReactions>
                    </Bubble>
               </MessageContent>
            </Message> 
        </MessageScrollerItem>
    )
}


