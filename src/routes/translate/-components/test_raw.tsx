
import { createChat } from "@shadcn/helpers/tanstack-ai"
import { useChat, type UIMessage } from "@tanstack/ai-react"
import {
  MessageCircleDashedIcon,
  RotateCwIcon,
} from "lucide-react"

// import { MessageAnimated } from "@/components/message-animated"
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


const chat = createChat()
  .user(
    "I'm building a chat for our app and the scroll behavior is driving me nuts. Every time the AI streams a reply, the whole thread jumps around."
  )
  .sleep(0)
  .assistant(({ writer }) => {
    writer.reasoning(
      "They are describing a streaming transcript that keeps taking control of the viewport. I should explain when auto-scroll follows and when it stops."
    )
    writer.sleep(1000)
    writer.text(
      "That's the classic streaming scroll problem. Wrap your message list in `MessageScroller` and turn on `autoScroll` — the viewport pins to the bottom as tokens arrive, so users always see the latest text land in place.\n\nThe important part: it only auto-scrolls while the reader is already at the bottom. The moment they scroll up to read something earlier, auto-scroll backs off and their position is preserved. You get smooth streaming without fighting the user's intent."
    )
  })


const initialMessages = chat.get(0)
const connection = chat.transport({ delayMs: 0 })
function getMessageText(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.content : ""))
    .join("")
}

export function TanStackAiHelperDemoRaw() {
  const { messages, append, status, setMessages } = useChat({
    initialMessages,
    connection,
  })
  const nextMessage = chat.next(messages)
  const isBusy = status === "submitted" || status === "streaming"
  return (
    <MessageScrollerProvider >
      <div className="flex items-center">
        <Button
          variant="default"
          disabled={!nextMessage || isBusy}
          onClick={(event) => {
            event.preventDefault()
            if (!nextMessage || isBusy) {
              return
            }
            void append(nextMessage)
          }}
        >Send</Button>
        <Button variant="outline" size="icon" aria-label="Reset conversation" onClick={() => setMessages(initialMessages)} disabled={isBusy}><RotateCwIcon /></Button>
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
