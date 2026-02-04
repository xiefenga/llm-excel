import { useState, useEffect, useMemo } from 'react'
import { FileSpreadsheet, Loader2, ArrowRight } from 'lucide-react'

import { cn } from '~/lib/utils'
import ExcelPreview from '~/components/excel-preview'
import ExcelIcon from '~/assets/iconify/vscode-icons/file-type-excel.svg?react'

import type { FixtureDataset } from '~/lib/api'

export type PreviewTab = 'input' | 'output'

/** 输出文件信息 */
export interface OutputFileInfo {
  file_id: string
  filename: string
  url: string
}

export interface FixturePreviewPanelProps {
  /** 数据集列表 */
  datasets: FixtureDataset[]
  /** 场景 ID（用于构建文件路径） */
  scenarioId: string
  /** 输出文件列表 */
  outputFiles?: OutputFileInfo[]
  /** 是否正在处理 */
  isProcessing?: boolean
  /** 是否正在加载 */
  isLoading?: boolean
  /** 当前激活的 Tab */
  activeTab?: PreviewTab
  /** Tab 切换回调 */
  onTabChange?: (tab: PreviewTab) => void
}

/**
 * 左侧预览面板组件
 * 
 * 显示测试用例的数据集和输出文件预览：
 * - 输入：数据集文件
 * - 输出：处理结果文件
 */
const FixturePreviewPanel = ({
  datasets,
  scenarioId,
  outputFiles = [],
  isProcessing = false,
  isLoading = false,
  activeTab: controlledTab,
  onTabChange,
}: FixturePreviewPanelProps) => {
  // 内部 Tab 状态
  const [internalTab, setInternalTab] = useState<PreviewTab>('input')
  const activeTab = controlledTab ?? internalTab
  const handleTabChange = (tab: PreviewTab) => {
    if (onTabChange) {
      onTabChange(tab)
    } else {
      setInternalTab(tab)
    }
  }

  // 选中的数据集
  const [selectedDataset, setSelectedDataset] = useState<string>()
  // 选中的输出文件
  const [selectedOutputFile, setSelectedOutputFile] = useState<string>()

  // 当前选中的数据集
  const currentDataset = useMemo(() => {
    if (selectedDataset) {
      return datasets.find(d => d.file === selectedDataset)
    }
    return datasets[0]
  }, [selectedDataset, datasets])

  // 当前选中的输出文件
  const currentOutputFile = useMemo(() => {
    if (selectedOutputFile) {
      return outputFiles.find(f => f.file_id === selectedOutputFile)
    }
    return outputFiles[0]
  }, [selectedOutputFile, outputFiles])

  // 自动选择第一个数据集
  useEffect(() => {
    if (datasets.length > 0 && !selectedDataset) {
      setSelectedDataset(datasets[0].file)
    }
  }, [datasets, selectedDataset])

  // 自动选择第一个输出文件
  useEffect(() => {
    if (outputFiles.length > 0 && !selectedOutputFile) {
      setSelectedOutputFile(outputFiles[0].file_id)
    }
  }, [outputFiles, selectedOutputFile])

  // 重置选中数据集当列表变化时
  useEffect(() => {
    if (datasets.length === 0) {
      setSelectedDataset(undefined)
    } else if (selectedDataset) {
      const exists = datasets.some(d => d.file === selectedDataset)
      if (!exists) {
        setSelectedDataset(datasets[0].file)
      }
    }
  }, [datasets, selectedDataset])

  // 重置选中输出文件当列表变化时
  useEffect(() => {
    if (outputFiles.length === 0) {
      setSelectedOutputFile(undefined)
    } else if (selectedOutputFile) {
      const exists = outputFiles.some(f => f.file_id === selectedOutputFile)
      if (!exists) {
        setSelectedOutputFile(outputFiles[0].file_id)
      }
    }
  }, [outputFiles, selectedOutputFile])

  const hasDatasets = datasets.length > 0
  const hasOutputFiles = outputFiles.length > 0

  // 构建数据集文件的预览 URL
  const getDatasetUrl = (filename: string) => {
    return `/api/fixture/dataset/${scenarioId}/${filename}`
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Tab 切换栏 */}
      <div className="flex items-center border-b border-gray-200 bg-linear-to-r from-white to-brand-muted/20">
        {/* 数据集 Tab */}
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
          <span>数据集</span>
          {hasDatasets && (
            <span className={cn(
              "px-1.5 py-0.5 text-xs rounded-full",
              activeTab === 'input' ? "bg-brand/20 text-brand-dark" : "bg-gray-100 text-gray-500"
            )}>
              {datasets.length}
            </span>
          )}
          {isLoading && (
            <Loader2 className="w-3.5 h-3.5 text-brand animate-spin" />
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

      {/* 数据集 Tab 内容 */}
      {activeTab === 'input' && (
        <>
          {/* 数据集选择器（多数据集时显示） */}
          {datasets.length > 1 && (
            <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 bg-gray-50/50 overflow-x-auto">
              {datasets.map((dataset) => (
                <button
                  key={dataset.file}
                  onClick={() => setSelectedDataset(dataset.file)}
                  title={dataset.description}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                    selectedDataset === dataset.file
                      ? "bg-brand-muted text-brand-dark"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <ExcelIcon className="w-3.5 h-3.5" />
                  <span className="max-w-[120px] truncate">{dataset.file}</span>
                </button>
              ))}
            </div>
          )}

          {/* 预览区域 */}
          <div className="flex-1 overflow-hidden bg-linear-to-br from-white to-gray-50/50">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                <p className="text-sm">加载中...</p>
              </div>
            ) : currentDataset ? (
              <ExcelPreview
                className="w-full h-full"
                fileUrl={getDatasetUrl(currentDataset.file)}
              />
            ) : (
              <EmptyState
                icon={<FileSpreadsheet className="w-12 h-12" />}
                title="暂无数据集"
                description="该测试用例没有关联数据集"
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
                  onClick={() => setSelectedOutputFile(file.file_id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                    selectedOutputFile === file.file_id
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
                description={isProcessing ? "正在处理中..." : "运行测试后将显示处理结果"}
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

export default FixturePreviewPanel
