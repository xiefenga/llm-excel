import { XCircle, CheckCircle2, Sparkles } from "lucide-react"

import { StepItem } from "~/components/step-item"

import type { AssistantMessage as AssistantMessageType } from "../types"

interface Props {
  message: AssistantMessageType;
}

/** 助手消息组件 */
const AssistantMessage = ({ message }: Props) => {
  const { steps, status, error } = message;

  // 判断是否有任何步骤在进行中
  const hasActiveStep = steps.some(
    (record) => record.status === "running" || record.status === "streaming"
  );

  // 判断最后一个步骤是否为 execute 且已完成
  const lastStep = steps[steps.length - 1];
  const isExecuteDone = lastStep?.step === "execute" && lastStep?.status === "done";

  // 全局错误（会话级/系统级错误，无步骤记录）
  if (status === "error" && error && steps.length === 0) {
    return (
      <div className="rounded-lg bg-error/10 border border-error/30 p-4">
        <div className="flex items-center gap-2 text-error">
          <XCircle className="w-5 h-5" />
          <span className="font-medium">处理失败</span>
        </div>
        <p className="mt-2 text-sm text-error">{error}</p>
      </div>
    );
  }

  // 待处理状态（尚未开始任何步骤）
  if (status === "pending" && steps.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-muted">
            <Sparkles className="w-5 h-5 text-brand" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">准备处理...</p>
            <p className="text-xs text-gray-500">正在建立连接</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 渲染步骤列表 - 直接遍历 steps 数组 */}
      {steps.map((record, index) => (
        <StepItem
          key={`${record.step}-${index}`}
          record={record}
          defaultExpanded={record.step === "execute" || record.step === "export"}
        />
      ))}

      {/* 全局错误提示 */}
      {status === "error" && error && (
        <div className="rounded-lg bg-error/10 border border-error/30 p-3">
          <div className="flex items-center gap-2 text-error">
            <XCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* 完成提示 */}
      {status === "done" && !hasActiveStep && isExecuteDone && (
        <div className="rounded-lg bg-success/10 border border-success/30 p-3">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">处理完成</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssistantMessage;
