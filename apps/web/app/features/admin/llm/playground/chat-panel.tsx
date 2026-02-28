import { useRef, useEffect } from "react";
import { Send, Square, Trash2, AlertTriangle } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  error?: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  input: string;
  isStreaming: boolean;
  canSend: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onClear: () => void;
}

export const ChatPanel = ({
  messages,
  input,
  isStreaming,
  canSend,
  onInputChange,
  onSend,
  onStop,
  onClear,
}: ChatPanelProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend && !isStreaming) {
        onSend();
      }
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-sm text-muted-foreground">
              <p>输入消息开始测试</p>
              <p className="mt-1 text-xs">
                选择 Provider 和 Model 后发送消息
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 p-4">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t bg-background p-4">
        <div className="flex items-end gap-2">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onClear}
            disabled={messages.length === 0 && !input}
            title="清空对话"
          >
            <Trash2 className="size-4" />
          </Button>
          <Textarea
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            rows={1}
            className="min-h-[40px] max-h-[120px] flex-1 resize-none text-sm"
          />
          {isStreaming ? (
            <Button size="icon-sm" variant="destructive" onClick={onStop} title="停止生成">
              <Square className="size-3.5" />
            </Button>
          ) : (
            <Button
              size="icon-sm"
              onClick={onSend}
              disabled={!canSend}
              title="发送"
            >
              <Send className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === "user";

  if (message.error) {
    return (
      <div className="my-2 rounded-lg border border-red-200 bg-red-50 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-red-700">错误</div>
            <pre className="mt-1 whitespace-pre-wrap break-all text-xs text-red-600">
              {message.error}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        <pre className="whitespace-pre-wrap break-words font-sans">
          {message.content}
          {!isUser && !message.content && (
            <span className="inline-block size-2 animate-pulse rounded-full bg-current" />
          )}
        </pre>
      </div>
    </div>
  );
};
