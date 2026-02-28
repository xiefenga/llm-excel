import { useState, useCallback, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { events } from "fetch-event-stream";

import { Button } from "~/components/ui/button";
import { usePermission } from "~/hooks/use-permission";
import { Permissions } from "~/lib/permissions";
import { API_BASE } from "~/lib/config";
import { useProviders, useModels } from "~/features/admin/llm/hooks";
import { ConfigPanel } from "./config-panel";
import { ChatPanel } from "./chat-panel";

import type { ChatMessage } from "./chat-panel";

const PlaygroundPage = () => {
  const canManage = usePermission(Permissions.SYSTEM_SETTINGS);
  const [searchParams] = useSearchParams();

  const initialProviderId = searchParams.get("provider") || "";
  const [selectedProviderId, setSelectedProviderId] = useState(initialProviderId);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const { data: providers = [] } = useProviders();
  const { data: models = [] } = useModels(selectedProviderId || undefined);

  // 当切换 provider 时清空 model 选择
  const handleProviderChange = useCallback((id: string) => {
    setSelectedProviderId(id);
    setSelectedModelId("");
  }, []);

  // 当 URL 参数中有 provider 但还没加载 providers 时，需要在加载后设置
  useEffect(() => {
    if (initialProviderId && providers.length > 0) {
      const found = providers.find((p) => p.id === initialProviderId);
      if (found) {
        setSelectedProviderId(found.id);
      }
    }
  }, [initialProviderId, providers]);

  const canSend = !!selectedProviderId && !!selectedModelId && !!input.trim();

  const handleSend = useCallback(async () => {
    if (!canSend || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const allMessages = [...messages, userMessage];
    setMessages(allMessages);
    setInput("");
    setIsStreaming(true);

    // 添加空的 assistant 消息
    const assistantMessage: ChatMessage = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMessage]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const body = {
        model_id: selectedModelId,
        messages: allMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature,
        max_tokens: maxTokens ? parseInt(maxTokens, 10) : null,
        stream: true,
      };

      const res = await fetch(
        `${API_BASE}/llm/providers/${selectedProviderId}/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage: string;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail || errorJson.msg || errorText;
        } catch {
          errorMessage = errorText;
        }
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "",
            error: `HTTP ${res.status}: ${errorMessage}`,
          };
          return updated;
        });
        return;
      }

      for await (const event of events(res, controller.signal)) {
        if (!event.data) continue;

        try {
          const data = JSON.parse(event.data);

          switch (event.event) {
            case "delta":
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: data.full_content || "",
                };
                return updated;
              });
              break;
            case "done":
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: data.content || "",
                };
                return updated;
              });
              break;
            case "error":
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: "",
                  error: data.message || "未知错误",
                };
                return updated;
              });
              break;
          }
        } catch {
          // ignore parse errors
        }
      }
    } catch (err) {
      const error = err as Error;
      if (error.name !== "AbortError") {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "",
            error: error.message || "请求失败",
          };
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [canSend, isStreaming, input, messages, selectedProviderId, selectedModelId, temperature, maxTokens]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleClear = useCallback(() => {
    setMessages([]);
    setInput("");
  }, []);

  if (!canManage) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
          <h2 className="mt-4 text-lg font-semibold">权限不足</h2>
          <p className="mt-2 text-sm text-slate-600">
            您没有权限访问 LLM Playground
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button asChild size="icon-sm" variant="ghost">
          <Link to="/admin">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-base font-semibold">LLM Playground</h1>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <ConfigPanel
          providers={providers}
          models={models}
          selectedProviderId={selectedProviderId}
          selectedModelId={selectedModelId}
          temperature={temperature}
          maxTokens={maxTokens}
          onProviderChange={handleProviderChange}
          onModelChange={setSelectedModelId}
          onTemperatureChange={setTemperature}
          onMaxTokensChange={setMaxTokens}
          disabled={isStreaming}
        />
        <ChatPanel
          messages={messages}
          input={input}
          isStreaming={isStreaming}
          canSend={canSend}
          onInputChange={setInput}
          onSend={handleSend}
          onStop={handleStop}
          onClear={handleClear}
        />
      </div>
    </div>
  );
};

export default PlaygroundPage;
