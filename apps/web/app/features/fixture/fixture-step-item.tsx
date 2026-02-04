import { useState } from 'react'
import { ChevronRight, ChevronDown, Loader2, CheckCircle2, XCircle } from 'lucide-react'

import { cn } from '~/lib/utils'

/** 步骤日志条目类型 */
export interface FixtureStepRecord {
  id: number
  step: string
  stageId: string
  status: 'running' | 'streaming' | 'done' | 'error'
  startedAt: Date
  completedAt?: Date
  streamingContent?: string
  output?: unknown
  error?: string
}

export interface FixtureStepItemProps {
  record: FixtureStepRecord
  defaultExpanded?: boolean
}

/** 计算耗时 */
const getDuration = (startedAt: Date, completedAt?: Date): string | null => {
  if (!completedAt) return null
  const ms = completedAt.getTime() - startedAt.getTime()
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

/** 获取显示内容 */
const getContent = (record: FixtureStepRecord): string => {
  if (record.status === 'done' && record.output) {
    if (record.step === 'execute') {
      return ''
    }
    return JSON.stringify(record.output, null, 2)
  }
  if (record.status === 'streaming' && record.streamingContent) {
    return record.streamingContent
  }
  if (record.status === 'error' && record.error) {
    return record.error
  }
  if (record.status === 'running') {
    return '执行中...'
  }
  return ''
}

/** Fixture 执行步骤项组件 */
const FixtureStepItem = ({ record, defaultExpanded = false }: FixtureStepItemProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const isRunning = record.status === 'running'
  const isStreaming = record.status === 'streaming'
  const isDone = record.status === 'done'
  const isError = record.status === 'error'

  const content = getContent(record)
  const hasContent = content.length > 0
  const duration = getDuration(record.startedAt, record.completedAt)

  // 渲染状态图标
  const renderStatusIcon = () => {
    if (isRunning || isStreaming) {
      return <Loader2 className="w-4 h-4 text-brand animate-spin" />
    }
    if (isDone) {
      return <CheckCircle2 className="w-4 h-4 text-brand" />
    }
    if (isError) {
      return <XCircle className="w-4 h-4 text-error" />
    }
    return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
  }

  // 错误状态样式
  if (isError) {
    return (
      <div className="rounded-lg overflow-hidden bg-error/5 border border-error/20">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-2 px-3 py-2 transition-colors hover:bg-error/10"
        >
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-error/10 text-error">
            <XCircle className="w-4 h-4" />
          </span>
          <span className="text-sm font-medium flex-1 text-error text-left">
            {record.step}
          </span>
          {duration && (
            <span className="text-xs text-error/60">{duration}</span>
          )}
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-error/60" />
          ) : (
            <ChevronRight className="w-4 h-4 text-error/60" />
          )}
        </button>
        {isExpanded && hasContent && (
          <div className="px-3 pb-3 pt-1">
            <pre className="text-xs text-error bg-error/10 rounded-lg p-3 whitespace-pre-wrap break-all overflow-x-auto">
              {content}
            </pre>
          </div>
        )}
      </div>
    )
  }

  // 正常状态
  return (
    <div className={cn(
      "rounded-lg overflow-hidden transition-all",
      isDone && "bg-brand-muted/50",
      (isRunning || isStreaming) && "bg-brand-muted ring-1 ring-brand/30"
    )}>
      <button
        type="button"
        onClick={() => hasContent && setIsExpanded(!isExpanded)}
        disabled={!hasContent}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 transition-colors",
          hasContent && "cursor-pointer hover:bg-black/5"
        )}
      >
        <span className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full",
          isDone && "bg-brand-muted text-brand-dark",
          (isRunning || isStreaming) && "bg-brand-muted text-brand-dark"
        )}>
          {renderStatusIcon()}
        </span>
        <span className={cn(
          "text-sm font-medium flex-1 text-left",
          isDone && "text-gray-700",
          (isRunning || isStreaming) && "text-brand-dark"
        )}>
          {record.step}
        </span>
        {isStreaming && record.streamingContent && (
          <span className="text-xs text-gray-400">
            {record.streamingContent.length} chars
          </span>
        )}
        {duration && (
          <span className="text-xs text-gray-400">{duration}</span>
        )}
        {isExpanded ? (
          <ChevronDown className={cn("w-4 h-4 text-gray-400", !hasContent && "invisible")} />
        ) : (
          <ChevronRight className={cn("w-4 h-4 text-gray-400", !hasContent && "invisible")} />
        )}
      </button>
      {isExpanded && hasContent && (
        <div className="px-3 pb-3 pt-1">
          <pre className={cn(
            "text-xs rounded-lg p-3 whitespace-pre-wrap break-all overflow-x-auto max-h-60 overflow-y-auto",
            isDone && "text-gray-600 bg-gray-50",
            isStreaming && "text-brand-dark bg-brand-muted/30"
          )}>
            {content}
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-brand ml-0.5 animate-pulse" />
            )}
          </pre>
        </div>
      )}
    </div>
  )
}

export default FixtureStepItem
