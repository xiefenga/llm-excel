import { useMemo } from 'react'
import { Download, RefreshCw, FileSpreadsheet, Lightbulb, ListChecks, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import ExcelPreview from '~/components/excel-preview'

import type { StepRecord, DoneStepRecord, ExecuteStepOutput } from '~/components/llm-chat/message-list/types'

export interface TaskResultProps {
  /** 输出文件路径 */
  outputFile?: string
  /** 步骤记录（用于提取思路解读等） */
  steps?: StepRecord[]
  /** 重新处理 */
  onReprocess?: () => void
  /** 是否显示预览 */
  showPreview?: boolean
}

/** 任务结果组件 */
const TaskResult = ({ outputFile, steps, onReprocess, showPreview = true }: TaskResultProps) => {
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(true)
  const [showStrategy, setShowStrategy] = useState(true)
  const [showManualSteps, setShowManualSteps] = useState(false)

  // 从 execute 步骤提取思路解读和快捷复现
  const executeOutput = useMemo(() => {
    const executeStep = steps?.find(s => s.step === 'execute' && s.status === 'done') as DoneStepRecord | undefined
    if (executeStep?.output) {
      return executeStep.output as ExecuteStepOutput
    }
    return null
  }, [steps])

  const strategy = executeOutput?.strategy
  const manualSteps = executeOutput?.manual_steps

  // 获取输出文件名
  const outputFileName = useMemo(() => {
    if (!outputFile) return '处理结果.xlsx'
    const parts = outputFile.split('/')
    return parts[parts.length - 1] || '处理结果.xlsx'
  }, [outputFile])

  if (!outputFile) {
    return null
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 标题 */}
      <div className="px-6 py-4 border-b border-gray-100 bg-linear-to-r from-white to-brand-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-muted flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">处理结果</h2>
              <p className="text-sm text-gray-500">{outputFileName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onReprocess && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReprocess}
                className="text-gray-600"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重新处理
              </Button>
            )}
            <Button
              size="sm"
              asChild
              className="bg-linear-to-r from-brand to-brand-teal hover:from-brand-dark hover:to-brand text-white"
            >
              <a href={outputFile} download={outputFileName}>
                <Download className="w-4 h-4 mr-2" />
                下载结果
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* 思路解读和快捷复现 */}
      {(strategy || manualSteps) && (
        <div className="px-6 py-4 border-b border-gray-100 space-y-4">
          {/* 思路解读 */}
          {strategy && (
            <div className="border border-info/30 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowStrategy(!showStrategy)}
                className="w-full flex items-center justify-between px-4 py-3 bg-info/10 hover:bg-info/15 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-info" />
                  <span className="text-sm font-medium text-info">思路解读</span>
                </div>
                {showStrategy ? (
                  <ChevronUp className="w-4 h-4 text-info" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-info" />
                )}
              </button>
              {showStrategy && (
                <pre className="text-sm p-4 whitespace-pre-wrap font-sans text-gray-700 bg-white">
                  {strategy}
                </pre>
              )}
            </div>
          )}

          {/* 快捷复现 */}
          {manualSteps && (
            <div className="border border-warning/30 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowManualSteps(!showManualSteps)}
                className="w-full flex items-center justify-between px-4 py-3 bg-warning/10 hover:bg-warning/15 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-warning" />
                  <span className="text-sm font-medium text-warning">快捷复现（手动操作步骤）</span>
                </div>
                {showManualSteps ? (
                  <ChevronUp className="w-4 h-4 text-warning" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-warning" />
                )}
              </button>
              {showManualSteps && (
                <pre className="text-sm p-4 whitespace-pre-wrap font-sans text-gray-700 bg-white">
                  {manualSteps}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Excel 预览 */}
      {showPreview && (
        <div>
          {/* 预览标题栏 */}
          <button
            onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
            className="w-full flex items-center justify-between px-6 py-3 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-100"
          >
            <div className="flex items-center gap-2">
              {isPreviewExpanded ? (
                <Eye className="w-4 h-4 text-gray-500" />
              ) : (
                <EyeOff className="w-4 h-4 text-gray-500" />
              )}
              <span className="text-sm font-medium text-gray-700">
                {isPreviewExpanded ? '隐藏预览' : '显示预览'}
              </span>
            </div>
            {isPreviewExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {/* 预览内容 */}
          {isPreviewExpanded && (
            <div className="h-[400px] bg-linear-to-br from-white to-gray-50/50">
              <ExcelPreview className="w-full h-full" fileUrl={outputFile} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TaskResult
