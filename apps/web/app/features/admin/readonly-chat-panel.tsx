/**
 * 只读聊天面板组件
 * 模拟真实对话界面的左右气泡布局
 */
import dayjs from 'dayjs'
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Download, Lightbulb, ListChecks, AlertCircle, FileSpreadsheet, Activity, Clock, Loader2, Upload } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'

import UserMessageCard from '~/features/task/user-message-card'
import { StepItem } from '~/components/step-item'
import ExcelPreview from '~/components/excel-preview'
import InsightCard from '~/components/insight-card'
import ExcelIcon from '~/assets/iconify/vscode-icons/file-type-excel.svg?react'
import { Streamdown } from 'streamdown'

import { cn, calculateDuration } from '~/lib/utils'
import type { ThreadTurn, ThreadTurnStep } from '~/lib/api'
import type { StepRecord, DoneStepRecord, ExecuteStepOutput } from '~/components/llm-chat/message-list/types'

/** 用户消息附件（简化版） */
export interface UserMessageAttachment {
  id: string
  filename: string
  path: string
}

/** 用户消息 */
export interface UserMessage {
  id: string
  role: 'user'
  content: string
  files: UserMessageAttachment[]
  timestamp: number
}

/** AI 响应 */
export interface AssistantMessage {
  id: string
  role: 'assistant'
  /** 处理步骤 */
  steps: StepRecord[]
  /** 本轮状态 */
  status: 'pending' | 'streaming' | 'done' | 'error'
  /** 错误信息 */
  error?: string
  /** 输出文件 */
  outputFiles: OutputFileInfo[]
  /** 思路解读 */
  strategy?: string
  /** 快捷复现 */
  manualSteps?: string
  /** 开始时间 */
  startedAt?: number
  /** 完成时间 */
  completedAt?: number
}

/** 输出文件信息 */
interface OutputFileInfo {
  file_id: string
  filename: string
  url: string
}

/** 对话轮次 */
export interface ConversationTurn {
  id: string
  userMessage: UserMessage
  assistantMessage?: AssistantMessage
}

export interface ReadOnlyChatPanelProps {
  /** 线程轮次列表（后端原始格式） */
  threadTurns: ThreadTurn[]
  /** 用户头像 */
  userAvatar?: string
  /** 是否显示加载状态 */
  isLoading?: boolean
}

/**
 * 将 ThreadTurn 转换为 ConversationTurn
 */
function convertThreadTurnToConversation(turn: ThreadTurn): ConversationTurn {
  const steps: StepRecord[] = turn.steps.map((step: ThreadTurnStep) => {
    const baseStep: StepRecord = {
      step: step.step as any,
      status: step.status as any,
      started_at: step.started_at,
      completed_at: step.completed_at,
    }

    if (step.step === 'chat' || step.step === 'execute') {
      return { ...baseStep, output: step.output } as any
    } else {
      return { ...baseStep, output: step.output, error: step.error } as any
    }
  })

  // 如果没有 chat 步骤但有 response_text，添加一个 chat 步骤
  const hasChatStep = steps.some(s => s.step === 'chat')
  if (!hasChatStep && turn.response_text) {
    steps.push({
      step: 'chat',
      status: 'done',
      output: turn.response_text,
      started_at: turn.created_at,
      completed_at: turn.completed_at,
    } as StepRecord)
  }

  const outputFiles: OutputFileInfo[] = []
  // 从 execute 步骤提取 strategy 和 manual_steps
  const executeStep = turn.steps.find(s => s.step === 'execute' && s.status === 'done')
  // 从 export 步骤提取输出文件（多个文件）
  const exportStep = turn.steps.find(s => s.step === 'export' && s.status === 'done')
  if (exportStep?.output && typeof exportStep.output === 'object' && exportStep.output !== null) {
    const output = exportStep.output as any
    if (Array.isArray(output.output_files)) {
      for (const file of output.output_files) {
        outputFiles.push({
          file_id: file.file_id || `output_${turn.id}_${outputFiles.length}`,
          filename: file.filename || 'output.xlsx',
          url: file.url || '',
        })
      }
    }
  }

  let strategy: string | undefined
  let manualSteps: string | undefined
  if (executeStep?.output && typeof executeStep.output === 'object' && executeStep.output !== null) {
    const output = executeStep.output as any
    strategy = output.strategy
    manualSteps = output.manual_steps
  }

  const hasError = turn.steps.some(s => s.status === 'error')
  const status = hasError ? 'error' : 'done'

  const assistantMessage: AssistantMessage = {
    id: `${turn.id}_assistant`,
    role: 'assistant',
    steps,
    status,
    outputFiles,
    strategy,
    manualSteps,
    startedAt: turn.created_at ? dayjs(turn.created_at).unix() : undefined,
    completedAt: turn.completed_at ? dayjs(turn.completed_at).unix() : undefined,
  }

  const userMessage: UserMessage = {
    id: `${turn.id}_user`,
    role: 'user',
    content: turn.user_query,
    files: (turn.files || []).map(file => ({
      id: file.id,
      filename: file.filename,
      path: file.path,
    })),
    timestamp: turn.created_at ? dayjs(turn.created_at).unix() : Date.now() / 1000,
  }

  return { id: turn.id, userMessage, assistantMessage }
}

const ReadOnlyChatPanel = ({ threadTurns, userAvatar, isLoading = false }: ReadOnlyChatPanelProps) => {
  const turns = useMemo(() => threadTurns.map(convertThreadTurnToConversation), [threadTurns])
  const scrollRef = useRef<HTMLDivElement>(null)
  const isSticky = useRef(true)

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    isSticky.current = true
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight })
    })
  }, [])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
    isSticky.current = atBottom
  }, [])

  useEffect(() => {
    if (turns.length > 0) scrollToBottom()
  }, [turns, scrollToBottom])

  const [previewFile, setPreviewFile] = useState<{ path: string; filename: string } | null>(null)

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50/50">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
        <span className="ml-2 text-gray-500">加载聊天记录中...</span>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-slate-50/50">
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-5">
        <div className="space-y-4">
          {turns.length === 0 && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-3">
                <FileSpreadsheet className="w-7 h-7 text-slate-400" />
              </div>
              <h1 className="text-xl font-bold text-slate-600 mb-1.5">无聊天记录</h1>
              <p className="text-gray-500 text-sm">该线程暂无对话内容</p>
            </div>
          )}

          {turns.map((turn) => (
            <TurnRenderer key={turn.id} turn={turn} userAvatar={userAvatar} isActive={false} />
          ))}
        </div>
      </div>

      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-[95vw]! max-h-[95vh]! w-[95vw]! h-[95vh]! flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>
              <div className="flex items-center gap-0.5">
                <ExcelIcon className="w-6 h-6 shrink-0" />
                <div>{previewFile?.filename}</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden min-h-0">
            {previewFile && previewFile.path && <ExcelPreview className="w-full h-full" fileUrl={previewFile.path} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const TurnRenderer = ({ turn, userAvatar, isActive }: { turn: ConversationTurn; userAvatar?: string; isActive: boolean }) => {
  const { userMessage, assistantMessage } = turn

  const executeOutput = useMemo(() => {
    if (!assistantMessage) return null
    const executeStep = assistantMessage.steps.find(s => s.step === 'execute' && s.status === 'done') as DoneStepRecord | undefined
    return executeStep?.output as ExecuteStepOutput | null
  }, [assistantMessage])

  const hasSteps = assistantMessage && assistantMessage.steps.length > 0
  const isAllDone = assistantMessage?.status === 'done' && hasSteps
  const hasError = assistantMessage?.status === 'error' || assistantMessage?.steps.some(s => s.status === 'error')
  const hasOutputFiles = assistantMessage && assistantMessage.outputFiles.length > 0

  const duration = useMemo(() => {
    if (!assistantMessage) return null
    return calculateDuration(assistantMessage.steps)
  }, [assistantMessage])

  const formattedCompletedTime = assistantMessage?.completedAt
    ? dayjs.unix(assistantMessage.completedAt).format('YYYY-MM-DD HH:mm')
    : null

  return (
    <div className={cn("space-y-4", isActive && "animate-pulse-subtle")}>
      {/* 用户消息 */}
      <UserMessageCard
        content={userMessage.content}
        files={userMessage.files}
        timestamp={userMessage.timestamp}
        avatar={userAvatar}
      />

      {/* 用户上传附件下载 */}
      {userMessage.files.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Upload className="w-4 h-4 text-slate-500" />
            上传附件
          </h3>
          <div className="space-y-2">
            {userMessage.files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 border border-slate-200"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
                  <ExcelIcon className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.filename}</p>
                  <p className="text-xs text-gray-500">用户上传</p>
                </div>
                <Button
                  size="sm"
                  asChild
                  variant="outline"
                  className="border-slate-300"
                >
                  <a href={file.path} download={file.filename} target="_blank" rel="noreferrer">
                    <Download className="w-4 h-4 mr-1" />
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI 响应 */}
      {assistantMessage && (
        <>
          {/* 步骤列表 */}
          {hasSteps && (
            <section className="space-y-2">
              {assistantMessage.steps.map((record, index) => {
                if (record.step === 'chat') {
                  let content = ''
                  if (record.status === 'streaming') {
                    content = (record as any).streamContent || ''
                  } else if (record.status === 'done') {
                    content = (record as any).output || ''
                  }

                  const isStreaming = record.status === 'streaming'

                  return (
                    <div
                      key={`${record.step}-${index}`}
                      className="text-sm text-gray-800 leading-relaxed py-2 px-1"
                    >
                      <Streamdown
                        mode={isStreaming ? 'streaming' : 'static'}
                        caret={isStreaming ? 'block' : undefined}
                      >
                        {typeof content === 'string' ? content : ''}
                      </Streamdown>
                    </div>
                  )
                }
                return <StepItem key={`${record.step}-${index}`} record={record} />
              })}

              {/* 全局错误 */}
              {assistantMessage.status === 'error' && assistantMessage.error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-error/10 border border-error/20">
                  <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <p className="text-xs text-error">{assistantMessage.error}</p>
                </div>
              )}
            </section>
          )}

          {/* 思路解读和快捷复现 */}
          {executeOutput && (executeOutput.strategy || executeOutput.manual_steps) && (
            <section className="space-y-3">
              {executeOutput.strategy && (
                <InsightCard
                  icon={<Lightbulb className="w-4 h-4" />}
                  title="思路解读"
                  content={executeOutput.strategy}
                  variant="info"
                  defaultExpanded
                />
              )}
              {executeOutput.manual_steps && (
                <InsightCard
                  icon={<ListChecks className="w-4 h-4" />}
                  title="快捷复现"
                  content={executeOutput.manual_steps}
                  variant="warning"
                  defaultExpanded
                />
              )}
            </section>
          )}

          {/* 结果下载 */}
          {isAllDone && hasOutputFiles && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Download className="w-4 h-4 text-brand" />
                处理结果
                {assistantMessage.outputFiles.length > 1 && (
                  <span className="px-1.5 py-0.5 text-xs rounded-full bg-brand/10 text-brand-dark">
                    {assistantMessage.outputFiles.length}
                  </span>
                )}
              </h3>
              <div className="space-y-2">
                {assistantMessage.outputFiles.map((file) => (
                  <div
                    key={file.file_id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-brand-muted/30 border border-brand/20"
                  >
                    <div className="w-10 h-10 rounded-lg bg-brand-muted flex items-center justify-center">
                      <ExcelIcon className="w-5 h-5 text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.filename}</p>
                      <p className="text-xs text-gray-500">处理完成</p>
                    </div>
                    <Button
                      size="sm"
                      asChild
                      className="bg-brand hover:bg-brand-dark text-white"
                    >
                      <a href={file.url} download={file.filename}>
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 处理摘要 */}
          {(isAllDone || hasError) && hasSteps && (
            <div className="flex items-center justify-between">
              <ProcessingSummary
                hasError={!!hasError}
                duration={duration}
                completedTime={formattedCompletedTime}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

const ProcessingSummary = ({ hasError, duration, completedTime }: { hasError: boolean; duration: string | null; completedTime: string | null }) => (
  <div className="flex items-center gap-3 text-gray-400 text-xs">
    {duration && (
      <div className="flex items-center gap-1">
        <Activity className="w-3.5 h-3.5" />
        <span>耗时 {duration}</span>
      </div>
    )}
    {completedTime && (
      <div className="flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" />
        <span>{completedTime}</span>
      </div>
    )}
  </div>
)


export default ReadOnlyChatPanel