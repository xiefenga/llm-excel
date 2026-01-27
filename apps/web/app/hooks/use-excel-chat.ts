import { v4 as uuid } from 'uuid'
import { useCallback, useEffect, useRef, useState } from "react";

import { processExcel, type SSEMessage } from "~/lib/api";

// 整体流程状态：loading -> analyzing -> generating -> executing
export type ProcessState = "loading" | "analyzing" | "generating" | "executing";

export type AssistantStatus = "pending" | "streaming" | "done" | "error";

type StepStatus = "start" | "done" | "error";
export type StepProgress = Partial<Record<ProcessState, StepStatus>>;

export interface UserMessageFile {
  id: string
  filename: string
  path: string
}

export interface UserMessage {
  id: string;
  role: "user";
  content: string;
  files?: UserMessageFile[]
}

export interface AssistantMessage {
  id: string;
  role: "assistant";
  analysis?: string;
  operations?: Record<string, unknown>;
  outputFile?: string;
  formulas?: string;
  error?: string;
  processState: ProcessState;
  status: AssistantStatus;
  steps?: StepProgress;
}

export type ChatMessage = UserMessage | AssistantMessage;


export interface InputType {
  text: string
  files: UserMessageFile[]
  thread_id?: string
}

interface UseExcelChatOptions {
  onStart?: () => void;
  onExecuteSuccess?: (outputFile: string, formulas: string, threadId?: string) => void;
  initialMessages?: ChatMessage[];
  threadId?: string;
  onRefreshThread?: () => void;
}

export const useExcelChat = ({ onExecuteSuccess, onStart, initialMessages, threadId, onRefreshThread }: UseExcelChatOptions) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages || []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(threadId);

  const abortRef = useRef<(() => void) | null>(null);

  const resetChat = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    setMessages([]);
    setIsProcessing(false);
    setCurrentThreadId(undefined);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.();
    };
  }, []);

  const sendMessage = useCallback(async ({ text, files, thread_id }: InputType) => {
    abortRef.current?.();

    const assistantId = uuid();

    const userMessage: UserMessage = {
      id: uuid(),
      role: "user",
      content: text,
      files
    };
    const assistantMessage: AssistantMessage = {
      id: assistantId,
      role: "assistant",
      processState: "loading",
      status: "pending",
      steps: { loading: "start" },
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsProcessing(true);

    let error: string | undefined;

    const onMessage = (msg: SSEMessage) => {
      const { action, status, data } = msg;

      // 将后端 action 映射为整体流程阶段
      const actionToStep: Record<SSEMessage["action"], ProcessState> = {
        load: "loading",
        analysis: "analyzing",
        generate: "generating",
        execute: "executing",
      };

      const step = actionToStep[action];

      if (status === "error" && data?.message) {
        error = data.message;
      }

      // 流式更新当前 assistant 消息
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantId) return m;
          const current = m as AssistantMessage;
          const updated: AssistantMessage = {
            ...current,
            processState: step,
            status: "streaming",
            steps: {
              ...current.steps,
              [step]: status as StepStatus,
            },
          };

          // @ts-expect-error ignore type error
          if (action === "refresh:thread") {
            onRefreshThread?.();
          }

          if (status === "done" && data) {
            if (action === "analysis" && typeof data.content === "string") {
              updated.analysis = data.content;
            }
            if (action === "generate" && typeof data.content === "object") {
              updated.operations = data.content as Record<string, unknown>;
            }
            if (action === "execute") {
              updated.outputFile = data.output_file;
              updated.formulas = data.formulas;
              // 从 SSE 消息中获取 thread_id（如果返回）
              const returnedThreadId = (data as any).thread_id;
              if (returnedThreadId && !currentThreadId) {
                setCurrentThreadId(returnedThreadId);
              }
              onExecuteSuccess?.(data.output_file!, data.formulas!, returnedThreadId || currentThreadId);
            }
          }

          if (status === "error" && data?.message) {
            updated.error = data.message;
            updated.status = "error";
          }

          return updated;
        })
      );
    };

    const onError = (err: Error) => {
      error = err.message;
      const message = err.message;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantId) return m;
          const current = m as AssistantMessage;
          return {
            ...current,
            error: message,
            status: "error",
            content: `处理失败: ${message}`,
          };
        })
      );
    };

    const onFinally = () => {
      setIsProcessing(false);
      const hasError = !!error;

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantId) return m;
          const current = m as AssistantMessage;
          return {
            ...current,
            error: error ?? current.error,
            status: hasError ? "error" : "done",
          };
        })
      );
    };

    const { abort } = processExcel({
      body: {
        query: text,
        file_ids: files.map(item => item.id),
        thread_id: thread_id || currentThreadId,
      },
      events: { onStart, onMessage, onError, onFinally, onSuccess: () => { } },
    })
    abortRef.current = abort;
  }, [currentThreadId]);

  return {
    messages,
    isProcessing,
    resetChat,
    sendMessage,
    threadId: currentThreadId,
    setMessages,
    clearMessages: useCallback(() => setMessages([]), [])
  };
}
