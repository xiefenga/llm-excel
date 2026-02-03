import { useState, useEffect, useMemo } from 'react'
import { FileSpreadsheet, ArrowRight, Loader2 } from 'lucide-react'

import { cn } from '~/lib/utils'
import ExcelPreview from '~/components/excel-preview'
import ExcelIcon from '~/assets/iconify/vscode-icons/file-type-excel.svg?react'

import type { UserMessageAttachment, OutputFileInfo } from '~/components/llm-chat/message-list/types'

export type PreviewTab = 'input' | 'output'

export interface PreviewPanelProps {
  /** 输入文件列表 */
  inputFiles?: UserMessageAttachment[]
  /** 输出文件列表 */
  outputFiles?: OutputFileInfo[]
  /** 是否正在处理中 */
  isProcessing?: boolean
  /** 当前激活的 Tab */
  activeTab?: PreviewTab
  /** Tab 切换回调 */
  onTabChange?: (tab: PreviewTab) => void
}

/** 左侧预览面板组件 */
const PreviewPanel = ({
  inputFiles = [],
  outputFiles = [],
  isProcessing = false,
  activeTab: controlledTab,
  onTabChange,
}: PreviewPanelProps) => {
  // 内部 Tab 状态（支持受控和非受控模式）
  const [internalTab, setInternalTab] = useState<PreviewTab>('input')
  const activeTab = controlledTab ?? internalTab
  const handleTabChange = (tab: PreviewTab) => {
    if (onTabChange) {
      onTabChange(tab)
    } else {
      setInternalTab(tab)
    }
  }

  // 选中的输入文件
  const [selectedInputFileId, setSelectedInputFileId] = useState<string>()
  // 选中的输出文件
  const [selectedOutputFileId, setSelectedOutputFileId] = useState<string>()

  // 当前选中的输入文件
  const currentInputFile = useMemo(() => {
    if (selectedInputFileId) {
      return inputFiles.find(f => f.id === selectedInputFileId)
    }
    return inputFiles[0]
  }, [selectedInputFileId, inputFiles])

  // 当前选中的输出文件
  const currentOutputFile = useMemo(() => {
    if (selectedOutputFileId) {
      return outputFiles.find(f => f.file_id === selectedOutputFileId)
    }
    return outputFiles[0]
  }, [selectedOutputFileId, outputFiles])

  // 自动选择第一个输入文件
  useEffect(() => {
    if (inputFiles.length > 0 && !selectedInputFileId) {
      setSelectedInputFileId(inputFiles[0].id)
    }
  }, [inputFiles, selectedInputFileId])

  // 自动选择第一个输出文件
  useEffect(() => {
    if (outputFiles.length > 0 && !selectedOutputFileId) {
      setSelectedOutputFileId(outputFiles[0].file_id)
    }
  }, [outputFiles, selectedOutputFileId])

  // 重置选中文件当文件列表变化时
  useEffect(() => {
    if (inputFiles.length === 0) {
      setSelectedInputFileId(undefined)
    } else if (selectedInputFileId) {
      // 如果当前选中的文件在新列表中找不到，自动切换到第一个
      const exists = inputFiles.some(f => f.id === selectedInputFileId)
      if (!exists) {
        setSelectedInputFileId(inputFiles[0].id)
      }
    }
  }, [inputFiles, selectedInputFileId])

  useEffect(() => {
    if (outputFiles.length === 0) {
      setSelectedOutputFileId(undefined)
    } else if (selectedOutputFileId) {
      // 如果当前选中的文件在新列表中找不到，自动切换到第一个
      const exists = outputFiles.some(f => f.file_id === selectedOutputFileId)
      if (!exists) {
        setSelectedOutputFileId(outputFiles[0].file_id)
      }
    }
  }, [outputFiles, selectedOutputFileId])

  const hasInputFiles = inputFiles.length > 0
  const hasOutputFiles = outputFiles.length > 0

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Tab 切换栏 */}
      <div className="flex items-center border-b border-gray-200 bg-linear-to-r from-white to-brand-muted/20">
        {/* 输入文件 Tab */}
        <button
          onClick={() => handleTabChange('input')}
          className={cn(
            "flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all",
            activeTab === 'input'
              ? "border-brand text-brand-dark bg-brand-muted/30"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50"
          )}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>输入文件</span>
          {hasInputFiles && (
            <span className={cn(
              "px-1.5 py-0.5 text-xs rounded-full",
              activeTab === 'input' ? "bg-brand/20 text-brand-dark" : "bg-gray-100 text-gray-500"
            )}>
              {inputFiles.length}
            </span>
          )}
        </button>

        {/* 处理箭头 */}
        <div className="flex items-center px-3">
          <ArrowRight className={cn(
            "w-4 h-4 transition-colors",
            isProcessing ? "text-brand animate-pulse" : "text-gray-300"
          )} />
        </div>

        {/* 输出结果 Tab */}
        <button
          onClick={() => hasOutputFiles && handleTabChange('output')}
          disabled={!hasOutputFiles}
          className={cn(
            "flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all",
            activeTab === 'output'
              ? "border-brand text-brand-dark bg-brand-muted/30"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50",
            !hasOutputFiles && "opacity-40 cursor-not-allowed"
          )}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>处理结果</span>
          {isProcessing && (
            <Loader2 className="w-3.5 h-3.5 text-brand animate-spin" />
          )}
          {hasOutputFiles && !isProcessing && (
            <span className={cn(
              "px-1.5 py-0.5 text-xs rounded-full",
              activeTab === 'output' ? "bg-brand/20 text-brand-dark" : "bg-gray-100 text-gray-500"
            )}>
              {outputFiles.length}
            </span>
          )}
        </button>
      </div>

      {/* 输入文件 Tab 内容 */}
      {activeTab === 'input' && (
        <>
          {/* 文件选择器（多文件时显示） */}
          {inputFiles.length > 1 && (
            <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 bg-gray-50/50 overflow-x-auto">
              {inputFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => setSelectedInputFileId(file.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                    selectedInputFileId === file.id
                      ? "bg-brand-muted text-brand-dark"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <ExcelIcon className="w-3.5 h-3.5" />
                  <span className="max-w-[120px] truncate">{file.filename}</span>
                </button>
              ))}
            </div>
          )}

          {/* 预览区域 */}
          <div className="flex-1 overflow-hidden bg-linear-to-br from-white to-gray-50/50">
            {currentInputFile ? (
              <ExcelPreview
                className="w-full h-full"
                fileUrl={currentInputFile.path}
              />
            ) : (
              <EmptyState
                icon={<FileSpreadsheet className="w-12 h-12" />}
                title="暂无输入文件"
                description="请在右侧上传 Excel 文件"
              />
            )}
          </div>
        </>
      )}

      {/* 输出结果 Tab 内容 */}
      {activeTab === 'output' && (
        <>
          {/* 输出文件选择器（多文件时显示） */}
          {outputFiles.length > 1 && (
            <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 bg-gray-50/50 overflow-x-auto">
              {outputFiles.map((file) => (
                <button
                  key={file.file_id}
                  onClick={() => setSelectedOutputFileId(file.file_id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                    selectedOutputFileId === file.file_id
                      ? "bg-brand-muted text-brand-dark"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="max-w-[120px] truncate">{file.filename}</span>
                </button>
              ))}
            </div>
          )}

          {/* 预览区域 */}
          <div className="flex-1 overflow-hidden bg-linear-to-br from-white to-brand-muted/10">
            {currentOutputFile ? (
              <ExcelPreview
                className="w-full h-full"
                fileUrl={currentOutputFile.url}
              />
            ) : (
              <EmptyState
                icon={<FileSpreadsheet className="w-12 h-12" />}
                title="暂无处理结果"
                description={isProcessing ? "正在处理中..." : "提交任务后将显示处理结果"}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

/** 空状态组件 */
const EmptyState = ({
  icon,
  title,
  description
}: {
  icon: React.ReactNode
  title: string
  description: string
}) => (
  <div className="flex flex-col items-center justify-center h-full text-gray-400">
    <div className="mb-3 opacity-40">{icon}</div>
    <p className="text-sm font-medium text-gray-500">{title}</p>
    <p className="text-xs text-gray-400 mt-1">{description}</p>
  </div>
)

export default PreviewPanel
