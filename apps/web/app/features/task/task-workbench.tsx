import dayjs from 'dayjs'
import invariant from 'tiny-invariant'
import { useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'

import { useChat } from '~/hooks/use-chat'
import { useAuthStore } from '~/stores/auth'
import { useFileUpload } from '~/hooks/use-file-upload'

import { getThreadDetail } from '~/lib/api'

import ChatPanel from './chat-panel'
import PreviewPanel from './preview-panel'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '~/components/ui/resizable'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'

import type { PreviewTab } from './preview-panel'
import type { ChatMessage } from '~/hooks/use-chat'
import type { ConversationTurn } from './chat-panel'
import type { AssistantMessage, UserMessage, StepRecord, StepName, StepError, UserMessageAttachment, OutputFileInfo, ExportStepOutput } from '~/components/llm-chat/message-list/types'

export interface TaskWorkbenchProps {
  threadId?: string
}

const TaskWorkbench = ({ threadId }: TaskWorkbenchProps) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)

  invariant(user)

  // 用于跟踪是否是新创建的会话
  const initThreadId = useRef<string>('')
  // 用于跟踪上一次加载的 threadId，避免重复请求
  const lastLoadedThreadId = useRef<string | undefined>(undefined)
  // 用于标记是否正在开启新会话（避免 useEffect 重复清空）
  const isStartingNewSession = useRef(false)

  // 任务状态
  const [taskState, setTaskState] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [query, setQuery] = useState('')
  const [outputFiles, setOutputFiles] = useState<OutputFileInfo[]>([])
  const [previewTab, setPreviewTab] = useState<PreviewTab>('input')
  // 当前活跃的轮次 ID
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null)
  // 新会话确认弹窗
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false)

  // 文件上传
  const fileUpload = useFileUpload()

  // 聊天/处理逻辑
  const { messages, sendMessage, setMessages, clearMessages, isProcessing } = useChat({
    onStart: () => {
      setTaskState('processing')
    },
    onSessionCreated: ({ thread_id }) => {
      initThreadId.current = thread_id
      navigate(`/threads/${thread_id}`)
      queryClient.invalidateQueries({ queryKey: ['threads'] })
    },
    onExportSuccess: (files) => {
      setOutputFiles(files)
      setTaskState('done')
      setActiveTurnId(null)
      // 自动切换到输出预览
      setPreviewTab('output')
    },
  })

  // 将 messages 转换为 turns 格式
  const turns = useMemo<ConversationTurn[]>(() => {
    const result: ConversationTurn[] = []

    // 遍历 messages，配对 user 和 assistant 消息
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      if (msg.role === 'user') {
        const userMsg = msg as UserMessage
        const nextMsg = messages[i + 1]
        const assistantMsg = nextMsg?.role === 'assistant' ? nextMsg as AssistantMessage : undefined

        // 提取该轮的输出文件
        let turnOutputFiles: OutputFileInfo[] = []
        if (assistantMsg?.steps) {
          const exportStep = assistantMsg.steps.find(s => s.step === 'export' && s.status === 'done')
          if (exportStep && 'output' in exportStep) {
            const output = exportStep.output as unknown as ExportStepOutput
            turnOutputFiles = output?.output_files ?? []
          }
        }

        const turn: ConversationTurn = {
          id: userMsg.id,
          userMessage: {
            id: userMsg.id,
            role: 'user',
            content: userMsg.content,
            files: userMsg.files ?? [],
            timestamp: userMsg.created ?? 0,
          },
          assistantMessage: assistantMsg ? {
            id: assistantMsg.id,
            role: 'assistant',
            steps: assistantMsg.steps ?? [],
            status: assistantMsg.status ?? 'pending',
            error: assistantMsg.error,
            outputFiles: turnOutputFiles,
            startedAt: undefined,
            completedAt: assistantMsg.completed,
          } : undefined,
        }
        result.push(turn)
      }
    }

    return result
  }, [messages])

  // 计算所有可用的输出文件（用于跨轮引用）
  const availableFiles = useMemo<OutputFileInfo[]>(() => {
    return turns.flatMap(turn => turn.assistantMessage?.outputFiles ?? [])
  }, [turns])

  // 获取最后一轮的状态
  const lastTurn = turns[turns.length - 1]
  const lastAssistantStatus = lastTurn?.assistantMessage?.status

  // 获取输入文件列表（用于预览面板）
  // 包含：历史轮次中所有的输入文件 + 当前输入框中上传的文件
  const inputFiles = useMemo(() => {
    // 从历史轮次中收集所有输入文件
    const historyFiles = turns.flatMap(turn => turn.userMessage.files)

    // 合并当前上传的文件，按 id 去重
    const allFiles = [...historyFiles, ...fileUpload.uploadedFiles]
    const uniqueFiles = allFiles.filter(
      (file, index, self) => self.findIndex(f => f.id === file.id) === index
    )

    return uniqueFiles
  }, [turns, fileUpload.uploadedFiles])

  // 加载历史任务
  const { mutate: loadThread } = useMutation({
    mutationFn: (id: string) => getThreadDetail(id),
    onSuccess: (thread) => {
      invariant(user)

      const loadedMessages: ChatMessage[] = []

      thread.turns.forEach((turn) => {
        // 添加用户消息
        loadedMessages.push({
          id: `${turn.id}-user`,
          avatar: user.avatar!,
          role: 'user',
          content: turn.user_query,
          files: turn.files,
          created: dayjs(turn.created_at).unix()
        } satisfies UserMessage)

        // 添加助手消息
        const turnSteps = (turn.steps || []).map((step) => {
          const baseStep = {
            step: step.step as StepName,
            started_at: step.started_at,
            completed_at: step.completed_at,
          }

          if (step.status === 'done' && step.output) {
            return { ...baseStep, status: 'done' as const, output: step.output }
          }
          if (step.status === 'error' && step.error) {
            return { ...baseStep, status: 'error' as const, error: step.error as StepError }
          }
          if (step.status === 'streaming') {
            return { ...baseStep, status: 'streaming' as const }
          }
          return { ...baseStep, status: 'running' as const }
        }) as StepRecord[]

        // 判断助手消息状态
        let assistantStatus: AssistantMessage['status'] = 'done'
        if (turn.status === 'processing') {
          assistantStatus = 'streaming'
        } else if (turn.status === 'failed') {
          assistantStatus = 'error'
        } else if (turn.status === 'pending') {
          assistantStatus = 'pending'
        }

        // 检查是否有步骤级错误
        const hasStepError = turnSteps.some((s) => s.status === 'error')
        const lastErrorStep = turnSteps.filter((s) => s.status === 'error').pop()
        const errorMessage = lastErrorStep && 'error' in lastErrorStep
          ? lastErrorStep.error?.message
          : undefined

        const assistantMessage: AssistantMessage = {
          id: `${turn.id}-assistant`,
          role: 'assistant',
          status: hasStepError ? 'error' : assistantStatus,
          steps: turnSteps,
          error: hasStepError ? errorMessage : undefined,
          completed: turn.completed_at ? dayjs(turn.completed_at).unix() : undefined,
        }

        loadedMessages.push(assistantMessage)
      })

      // 提取输出文件 - 从 export 步骤获取
      const lastTurn = thread.turns[thread.turns.length - 1]
      if (lastTurn) {
        const exportStep = lastTurn.steps?.find(s => s.step === 'export' && s.status === 'done')
        if (exportStep?.output) {
          const output = exportStep.output as unknown as ExportStepOutput
          if (output.output_files?.length > 0) {
            setOutputFiles(output.output_files)
            setTaskState('done')
          }
        }
      }

      setMessages(loadedMessages)
    }
  })

  // 监听 threadId 变化
  useEffect(() => {
    // 如果 threadId 没有变化，不做任何操作
    if (lastLoadedThreadId.current === threadId) {
      return
    }

    if (threadId) {
      // 直接切换历史会话
      if (!initThreadId.current) {
        clearMessages()
        fileUpload.clearFiles()
        setOutputFiles([])
        setTaskState('idle')
        setPreviewTab('input')
        loadThread(threadId)
        lastLoadedThreadId.current = threadId
      } else {
        initThreadId.current = ''
        lastLoadedThreadId.current = threadId
      }
    } else {
      // 新任务 - 只在从有 threadId 切换到无 threadId 时清空
      // 如果是主动开启新会话，跳过清空逻辑（已在 onConfirmNewSession 中处理）
      if (lastLoadedThreadId.current !== undefined && !isStartingNewSession.current) {
        clearMessages()
        fileUpload.clearFiles()
        setOutputFiles([])
        setTaskState('idle')
        setPreviewTab('input')
      }
      isStartingNewSession.current = false
      lastLoadedThreadId.current = undefined
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId])

  // 监听处理状态
  useEffect(() => {
    if (isProcessing) {
      setTaskState('processing')
    } else if (lastAssistantStatus === 'error') {
      setTaskState('error')
      setActiveTurnId(null)
    } else if (lastAssistantStatus === 'done' && outputFiles.length > 0) {
      setTaskState('done')
      setActiveTurnId(null)
    }
  }, [isProcessing, lastAssistantStatus, outputFiles.length])

  // 实际执行发送消息的逻辑
  const doSendMessage = (targetThreadId?: string) => {
    const files = fileUpload.uploadedFiles.map(item => ({
      id: item.id,
      filename: item.filename,
      path: item.path
    }))

    // 生成新轮次 ID 并设为活跃
    const newTurnId = `turn-${Date.now()}`
    setActiveTurnId(newTurnId)

    sendMessage({ text: query, files, thread_id: targetThreadId })
    setQuery('')
    // 清空已上传的文件（下一轮需要重新上传或选择历史文件）
    fileUpload.clearFiles()
  }

  // 提交任务
  const onSubmit = () => {
    if (isProcessing) {
      return
    }

    const files = fileUpload.uploadedFiles.map(item => ({
      id: item.id,
      filename: item.filename,
      path: item.path
    }))

    // 空对话时需要文件，有历史时可以基于上下文继续
    const hasHistory = turns.length > 0

    if (!query.trim()) {
      return
    }

    // 有历史记录时，提示用户开启新会话
    if (hasHistory) {
      // 新会话需要文件
      if (files.length === 0) {
        return
      }
      setShowNewSessionDialog(true)
      return
    }

    // 新会话需要文件
    if (files.length === 0) {
      return
    }

    doSendMessage(threadId)
  }

  // 确认开启新会话
  const onConfirmNewSession = () => {
    setShowNewSessionDialog(false)
    // 清空当前状态
    clearMessages()
    setOutputFiles([])
    setTaskState('idle')
    setPreviewTab('input')
    setActiveTurnId(null)
    // 标记正在开启新会话，避免 useEffect 重复清空
    isStartingNewSession.current = true
    // 导航到新任务页面，不带 threadId
    navigate('/threads')
    // 发送消息（不带 thread_id，会创建新会话）
    doSendMessage(undefined)
  }

  // 清空对话
  const onClear = () => {
    setOutputFiles([])
    setTaskState('idle')
    setPreviewTab('input')
    setActiveTurnId(null)
    clearMessages()
    fileUpload.clearFiles()
    // 导航到新任务页面
    navigate('/threads')
  }

  // 重试指定轮次
  const onRetry = (turnId: string) => {
    const turn = turns.find(t => t.id === turnId)
    if (!turn) return

    // 重新发送该轮的消息
    const files = turn.userMessage.files.map(f => ({
      id: f.id,
      filename: f.filename,
      path: f.path
    }))

    setActiveTurnId(turnId)
    sendMessage({ text: turn.userMessage.content, files, thread_id: threadId })
  }

  // 取消当前处理（暂未实现后端支持）
  const onCancel = () => {
    // TODO: 实现取消逻辑
    setActiveTurnId(null)
  }

  return (
    <div className="h-full">

      <AlertDialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
        <AlertDialogContent className='w-96'>
          <AlertDialogHeader>
            <AlertDialogTitle>开启新会话</AlertDialogTitle>
            <AlertDialogDescription>
              目前只支持单轮会话，确认后将开启新会话。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='justify-center!'>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmNewSession}
              className="bg-brand! hover:bg-brand-dark! text-brand-foreground"
            >
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* 左侧：Excel 预览面板 */}
        <ResizablePanel defaultSize={60} minSize={40}>
          <PreviewPanel
            inputFiles={inputFiles}
            outputFiles={outputFiles}
            isProcessing={isProcessing}
            activeTab={previewTab}
            onTabChange={setPreviewTab}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* 右侧：对话面板 */}
        <ResizablePanel defaultSize={40} minSize={30}>
          <ChatPanel
            turns={turns}
            query={query}
            fileUpload={fileUpload}
            onQueryChange={setQuery}
            activeTurnId={activeTurnId}
            isProcessing={isProcessing}
            onSubmit={onSubmit}
            onRetry={onRetry}
            onCancel={onCancel}
            onClear={onClear}
            availableFiles={availableFiles}
            userAvatar={user.avatar ?? undefined}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

export default TaskWorkbench
