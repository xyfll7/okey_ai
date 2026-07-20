// mockAdapter.ts
import { stream, type ConnectionAdapter } from "@tanstack/ai-react";
import {
  EventType,
  type StreamChunk,
  type ModelMessage,
  type UIMessage,
} from "@tanstack/ai/client";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface MockAdapterOptions {
  /** 每个词之间的基础延迟(ms),默认 40 */
  wordDelay?: number;
  /** 首字节延迟,模拟网络/推理耗时,默认 300 */
  firstByteDelay?: number;
  /** 是否先流式输出一段 thinking/reasoning 内容 */
  withThinking?: boolean;
  /** 命中该关键词时模拟报错,用于测试错误处理分支 */
  errorTrigger?: string;
}

/** 从 ModelMessage[] 或 UIMessage[] 中提取最后一条用户消息的纯文本 */
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


export function createMockAdapter(options: MockAdapterOptions = {}): ConnectionAdapter {
  const {
    wordDelay = 40,
    firstByteDelay = 300,
    withThinking = false,
    errorTrigger = "报错测试",
  } = options;

  return stream(async function* (messages, _data, abortSignal) {
    const runId = `mock-run-${Date.now()}`;
    const threadId = `mock-thread-${Date.now()}`;
    const messageId = `mock-msg-${Date.now()}`;
    const model = "mock-model";
    const now = () => Date.now();
    const userText = extractLastUserText(messages);

    yield {
      type: EventType.RUN_STARTED,
      runId,
      threadId,
      model,
      timestamp: now(),
    } satisfies StreamChunk;

    await sleep(firstByteDelay);
    if (abortSignal?.aborted) return;

    // 触发错误分支,方便测试错误处理 UI
    if (errorTrigger && userText.includes(errorTrigger)) {
      yield {
        type: EventType.RUN_ERROR,
        runId,
        model,
        timestamp: now(),
        message: "这是一个模拟错误,用于测试错误处理逻辑",
      } satisfies StreamChunk;
      return;
    }

    // 可选:先流式吐出一段 thinking/reasoning 内容
    if (withThinking) {
      const thinkingId = `${messageId}-thinking`;
      yield {
        type: EventType.REASONING_START,
        messageId: thinkingId,
        model,
        timestamp: now(),
      } satisfies StreamChunk;
      yield {
        type: EventType.REASONING_MESSAGE_START,
        messageId: thinkingId,
        role: "reasoning",
        model,
        timestamp: now(),
      } satisfies StreamChunk;

      const thinkingText = "让我想想怎么回复这条消息……";
      for (const ch of thinkingText) {
        if (abortSignal?.aborted) return;
        yield {
          type: EventType.REASONING_MESSAGE_CONTENT,
          messageId: thinkingId,
          delta: ch,
          model,
          timestamp: now(),
        } satisfies StreamChunk;
        await sleep(wordDelay / 2);
      }

      yield {
        type: EventType.REASONING_MESSAGE_END,
        messageId: thinkingId,
        model,
        timestamp: now(),
      } satisfies StreamChunk;
      yield {
        type: EventType.REASONING_END,
        messageId: thinkingId,
        model,
        timestamp: now(),
      } satisfies StreamChunk;
    }

    // 正文:按词流式输出
    yield {
      type: EventType.TEXT_MESSAGE_START,
      messageId,
      role: "assistant",
      model,
      timestamp: now(),
    } satisfies StreamChunk;

    const replyText = `${userText}收到你的消息`;
    for (const word of replyText.split(/(?<=\s)/)) {
      if (abortSignal?.aborted) return;
      yield {
        type: EventType.TEXT_MESSAGE_CONTENT,
        messageId,
        delta: word,
        model,
        timestamp: now(),
      } satisfies StreamChunk;
      await sleep(wordDelay + Math.random() * wordDelay);
    }

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
        completionTokens: replyText.length,
        totalTokens: userText.length + replyText.length,
      },
    } satisfies StreamChunk;
  });
}


