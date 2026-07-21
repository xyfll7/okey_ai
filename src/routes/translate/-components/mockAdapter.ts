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


/** 后端 `chat_stream` 通过 Tauri Channel 推送的事件(与 store/index.ts 中的 handleStream 保持一致) */
type StreamEvent =
    | { event: "chunk"; data: { content: string } }
    | { event: "done"; data?: unknown }
    | { event: "error"; data: { message: string } };

interface MockAdapterOptions {
    /** 直接指定后端所需的 prompt_tag,缺省时从最后一条用户消息文本推导 */
    promptTag?: ChatMessage;
}

/**
 * 从 ModelMessage[] 或 UIMessage[] 中提取最后一条用户消息的纯文本。
 *
 * 限制(有意为之):当前产品(翻译应用)仅支持纯文本消息 —— ChatMessage.content 为
 * string、Inputer 只发文本、PromptTag 字段全为字符串,全代码库无图片/文件上传入口。
 * 因此当 content 是数组(或 UIMessage.parts)且其中 part 不含 text 字段(如图片、文件、
 * 工具结果等)时,会被静默忽略为 ""。这在现阶段不会触发,因为上层不会构造非文本消息。
 * 若未来接入多模态,需在此显式处理非文本 part(如提取占位描述或透传给后端),否则会静默
 * 发送空 prompt 给后端,导致"发图片后 AI 无响应"类问题难以定位。
 */
function extractLastUserText(
    messages: Array<UIMessage> | Array<ModelMessage>,
): string {
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];

        // ModelMessage: { role, content }
        if ("content" in m && m.role === "user") {
            const { content } = m;
            if (typeof content === "string") return content;
            if (Array.isArray(content)) {
                return content
                    .map((part) => ("text" in part && typeof part.text === "string" ? part.text : ""))
                    .join("");
            }
        }

        // UIMessage: { role, parts }
        if ("parts" in m && m.role === "user") {
            return m.parts
                .map((part) => (part.type === "text" ? part.content : ""))
                .join("");
        }
    }
    return "";
}

/**
 * 通过 Tauri Channel 调用真实后端 `chat_stream`,将 StreamEvent 转换为 TanStack
 * 的 StreamChunk 流式吐给 useChat(原 store/index.ts 中 handleStream 的逻辑迁移至此)。
 */
export function createMockAdapter(options: MockAdapterOptions = {}): ConnectionAdapter {
    return stream(async function* (messages, _data, abortSignal) {
        const runId = `run-${Date.now()}`;
        const threadId = `thread-${Date.now()}`;
        const messageId = `msg-${Date.now()}`;
        const model = "backend-model";
        const now = () => Date.now();
        const userText = extractLastUserText(messages);
        const promptTag: ChatMessage = options.promptTag ?? { content: userText };
        
        // 事件队列:由 Tauri Channel 回调填充,再由生成器消费
        // (生成器中的 yield 不能出现在回调里,所以用队列中转)
        const queue: StreamEvent[] = [];
        let finished = false;
        let errored = false;
        let aborted = false;
        let accumulated = "";
        let resolveNext: (() => void) | null = null;
        const notify = () => {
            resolveNext?.();
            resolveNext = null;
        };

        // abort 时必须主动唤醒可能正卡在空队列等待上的循环,
        // 否则只有等下一条消息到达才会检测到 aborted
        const onAbort = () => {
            aborted = true;
            finished = true;
            notify();
        };
        abortSignal?.addEventListener("abort", onAbort);

        const channel = new Channel<StreamEvent>();
        channel.onmessage = (message) => {
            queue.push(message);
            if (message.event === "done" || message.event === "error") finished = true;
            notify();
        };

        try {
            yield {
                type: EventType.RUN_STARTED,
                runId,
                threadId,
                model,
                timestamp: now(),
            } satisfies StreamChunk;

            yield {
                type: EventType.TEXT_MESSAGE_START,
                messageId,
                role: "assistant",
                model,
                timestamp: now(),
            } satisfies StreamChunk;

            // 调用真实后端流式接口
            void invoke(EVENT_NAMES.chat_stream, {
                prompt_tag: promptTag,
                on_event: channel,
            }).catch((err) => {
                if (aborted) return; // 已中止,忽略后续到达的错误
                finished = true;
                errored = true;
                queue.push({ event: "error", data: { message: String(err) } });
                notify();
            });

            while (!finished || queue.length > 0) {
                if (aborted || abortSignal?.aborted) {
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
                        errored = true;
                        // 协议上 TEXT_MESSAGE_START 已先发出,这里先补一个 END 闭合消息:
                        // 1) 刷新末尾可能被 chunk 策略缓冲而未落库的 delta;
                        // 2) 符合 AG-UI "START/END 配对" 约定。
                        // 注意:消费端(TanStack StreamProcessor)并不强制 END 配对才能退出流式态
                        // —— UI 的 loading/status 由 RUN_ERROR -> status="error" + isLoading=false 驱动,
                        // 且 finalizeStream() 只在 RUN_FINISHED 时触发,故此处补 END 不会让本次流被误判为成功。
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

            if (errored) return;

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
                    // 注意:这里是字符长度的近似值,不是真实 token 数
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
