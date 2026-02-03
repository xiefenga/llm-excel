import { useMemo } from 'react'
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

import { cn } from '~/lib/utils'
import { StepItem, STEP_NAMES } from '~/components/step-item'

import type { StepRecord } from '~/components/step-item'

export interface TaskProgressProps {
  /** 步骤记录列表 */
  steps: StepRecord[]
  /** 任务状态 */
  status: 'pending' | 'streaming' | 'done' | 'error'
  /** 错误信息 */
  error?: string
  /** 是否显示详细步骤（展开模式） */
  showDetail?: boolean
}

/** 任务进度组件 */
const TaskProgress = ({ steps, status, error, showDetail = true }: TaskProgressProps) => {
  // 计算进度百分比
  const progress = useMemo(() => {
    const totalSteps = STEP_NAMES.length
    const completedSteps = steps.filter(s => s.status === 'done').length
    const currentStep = steps.find(s => s.status === 'running' || s.status === 'streaming')

    // 基础进度 = 已完成步骤数
    let base = (completedSteps / totalSteps) * 100

    // 如果有正在进行的步骤，加一点进度
    if (currentStep) {
      base += (1 / totalSteps) * 50 // 当前步骤算一半
    }

    return Math.min(base, 100)
  }, [steps])

  // 当前正在进行的步骤
  const currentStep = steps.find(s => s.status === 'running' || s.status === 'streaming')
  const currentStepName = currentStep?.step

  // 判断是否有任何步骤在进行中
  const hasActiveStep = steps.some(s => s.status === 'running' || s.status === 'streaming')

  // 判断是否全部完成
  const isAllDone = status === 'done' && !hasActiveStep

  // 判断是否有错误
  const hasError = status === 'error' || steps.some(s => s.status === 'error')

  // 获取状态文本
  const getStatusText = () => {
    if (hasError) return '处理失败'
    if (isAllDone) return '处理完成'
    if (currentStepName) {
      const stepLabels: Record<string, string> = {
        load: '正在加载文件...',
        generate: '正在生成操作...',
        validate: '正在验证操作...',
        execute: '正在执行处理...',
        export: '正在导出结果...',
      }
      return stepLabels[currentStepName] || '处理中...'
    }
    if (status === 'pending') return '准备中...'
    return '处理中...'
  }

  // 获取状态图标
  const getStatusIcon = () => {
    if (hasError) {
      return <XCircle className="w-5 h-5 text-error" />
    }
    if (isAllDone) {
      return <CheckCircle2 className="w-5 h-5 text-brand" />
    }
    return <Loader2 className="w-5 h-5 text-brand animate-spin" />
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 标题和进度 */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <h2 className="text-lg font-semibold text-gray-900">处理进度</h2>
          </div>
          <span className={cn(
            "text-sm font-medium",
            hasError && "text-error",
            isAllDone && "text-brand",
            !hasError && !isAllDone && "text-gray-600"
          )}>
            {getStatusText()}
          </span>
        </div>

        {/* 进度条 */}
        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out",
              hasError && "bg-error",
              isAllDone && "bg-linear-to-r from-brand to-brand-teal",
              !hasError && !isAllDone && "bg-linear-to-r from-brand to-brand-teal"
            )}
            style={{ width: `${progress}%` }}
          />
          {/* 进度条动画效果（处理中时） */}
          {!isAllDone && !hasError && (
            <div
              className="absolute top-0 h-full w-20 bg-linear-to-r from-transparent via-white/30 to-transparent animate-shimmer"
              style={{ left: `${Math.max(0, progress - 10)}%` }}
            />
          )}
        </div>

        {/* 步骤指示器（简化版） */}
        <div className="flex items-center justify-between mt-4">
          {STEP_NAMES.map((stepName, index) => {
            const stepRecord = steps.find(s => s.step === stepName)
            const isDone = stepRecord?.status === 'done'
            const isActive = stepRecord?.status === 'running' || stepRecord?.status === 'streaming'
            const isErrored = stepRecord?.status === 'error'
            const isPending = !stepRecord

            return (
              <div key={stepName} className="flex items-center">
                {/* 步骤点 */}
                <div className={cn(
                  "w-3 h-3 rounded-full transition-all",
                  isDone && "bg-brand",
                  isActive && "bg-brand ring-4 ring-brand/20",
                  isErrored && "bg-error",
                  isPending && "bg-gray-200"
                )} />

                {/* 连接线 */}
                {index < STEP_NAMES.length - 1 && (
                  <div className={cn(
                    "w-full h-0.5 mx-1 transition-all",
                    steps.findIndex(s => s.step === STEP_NAMES[index + 1]) !== -1 || isDone
                      ? "bg-brand"
                      : "bg-gray-200"
                  )} style={{ minWidth: '20px' }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 详细步骤列表 */}
      {showDetail && steps.length > 0 && (
        <div className="p-6 space-y-3">
          {steps.map((record, index) => (
            <StepItem
              key={`${record.step}-${index}`}
              record={record}
              defaultExpanded={record.step === 'execute' || record.step === 'export'}
            />
          ))}

          {/* 全局错误提示 */}
          {status === 'error' && error && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-error/10 border border-error/30">
              <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-error">处理失败</p>
                <p className="text-sm text-error/80 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* 完成提示 */}
          {isAllDone && !hasError && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-brand-muted/50 border border-brand/20">
              <CheckCircle2 className="w-5 h-5 text-brand shrink-0" />
              <p className="text-sm font-medium text-brand-dark">处理完成！请查看下方结果</p>
            </div>
          )}
        </div>
      )}

      {/* 等待开始状态 */}
      {status === 'pending' && steps.length === 0 && (
        <div className="p-6">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">准备处理...</p>
              <p className="text-xs text-gray-500 mt-0.5">正在建立连接</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskProgress
