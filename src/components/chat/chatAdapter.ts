// mockAdapter.ts
import { stream, type ConnectionAdapter } from "@tanstack/ai-react";
import {
    EventType,
    type StreamChunk,
    type ModelMessage,
    type UIMessage,
} from "@tanstack/ai/client";
import { Channel, invoke } from "@tauri-apps/api/core";
import { EVENT_NAMES } from "@/lib/events";
import type { ChatMessage } from "@/lib/types";


type StreamEvent =
    | { event: "chunk"; data: { content: string } }
    | { event: "done"; data?: unknown }
    | { event: "error"; data: { message: string } };

interface MockAdapterOptions {
    promptTag?: ChatMessage;
}


function extractLastUserText(
    messages: Array<UIMessage> | Array<ModelMessage>,
): string {
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];

        if ("content" in m && m.role === "user") {
            const { content } = m;
            if (typeof content === "string") return content;
            if (Array.isArray(content)) {
                return content
                    .map((part) => ("text" in part && typeof part.text === "string" ? part.text : ""))
                    .join("");
            }
        }

        if ("parts" in m && m.role === "user") {
            return m.parts
                .map((part) => (part.type === "text" ? part.content : ""))
                .join("");
        }
    }
    return "";
}


interface ChatStreamState {
    finished: boolean;
    errored: boolean;
    aborted: boolean;
}


function startChatStream(
    promptTag: ChatMessage,
    queue: StreamEvent[],
    state: ChatStreamState,
    notify: () => void,
): void {
    const channel = new Channel<StreamEvent>();

    channel.onmessage = (message) => {
        queue.push(message);

        if (message.event === "done" || message.event === "error") state.finished = true;
        notify();
    };
    void invoke(EVENT_NAMES.chat_stream, {
        prompt_tag: promptTag,
        on_event: channel,
    }).catch((err) => {
        if (state.aborted) return; 
        state.finished = true;
        state.errored = true;
        queue.push({ event: "error", data: { message: String(err) } });
        notify();
    });
}

export function chatAdapter(options: MockAdapterOptions = {}): ConnectionAdapter {
    return stream(async function* (messages, _data, abortSignal) {
        const runId = `run-${Date.now()}`;
        const threadId = `thread-${Date.now()}`;
        const messageId = `msg-${Date.now()}`;
        const model = "backend-model";
        const now = () => Date.now();
        const userText = extractLastUserText(messages);
        const promptTag: ChatMessage = options.promptTag ?? { content: userText };
      
        const queue: StreamEvent[] = [];
        const state: ChatStreamState = { finished: false, errored: false, aborted: false };
        let accumulated = "";
        let resolveNext: (() => void) | null = null;
        const notify = () => {
            resolveNext?.();
            resolveNext = null;
        };

        const onAbort = () => {
            state.aborted = true;
            state.finished = true;
            notify();
        };
        abortSignal?.addEventListener("abort", onAbort);


        try {
            yield {
                type: EventType.RUN_STARTED,
                runId,
                threadId,
                model,
                timestamp: now(),
            } satisfies StreamChunk;
            startChatStream(promptTag, queue, state, notify);
            yield {
                type: EventType.TEXT_MESSAGE_START,
                messageId,
                role: "assistant",
                model,
                timestamp: now(),
            } satisfies StreamChunk;


            while (!state.finished || queue.length > 0) {
                if (state.aborted || abortSignal?.aborted) {
                    void invoke(EVENT_NAMES.abort_chat_stream).catch(() => { });
                    return;
                }
                if (queue.length === 0) {
                    await new Promise<void>((resolve) => {
                        resolveNext = resolve;
                    });
                    continue;
                }
                const message = queue.shift()!;
                switch (message.event) {
                    case "chunk": {
                        const delta = message.data?.content ?? "";
                        accumulated += delta;
                        yield {
                            type: EventType.TEXT_MESSAGE_CONTENT,
                            messageId,
                            delta,
                            model,
                            timestamp: now(),
                        } satisfies StreamChunk;
                        break;
                    }
                    case "error": {
                        state.errored = true;
                   
                        yield {
                            type: EventType.TEXT_MESSAGE_END,
                            messageId,
                            model,
                            timestamp: now(),
                        } satisfies StreamChunk;
                        yield {
                            type: EventType.RUN_ERROR,
                            runId,
                            model,
                            timestamp: now(),
                            message: message.data?.message ?? "stream error",
                        } satisfies StreamChunk;
                        break;
                    }
                    case "done":
                    default:
                        break;
                }
            }

            if (state.errored) return;

            yield {
                type: EventType.TEXT_MESSAGE_END,
                messageId,
                model,
                timestamp: now(),
            } satisfies StreamChunk;

            yield {
                type: EventType.RUN_FINISHED,
                runId,
                threadId,
                model,
                timestamp: now(),
                finishReason: "stop",
                usage: {
                    promptTokens: userText.length,
                    completionTokens: accumulated.length,
                    totalTokens: userText.length + accumulated.length,
                },
            } satisfies StreamChunk;
        } finally {
            abortSignal?.removeEventListener("abort", onAbort);
        }
    });
}
