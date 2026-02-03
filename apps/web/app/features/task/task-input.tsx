import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { X, RefreshCw, ArrowUp, Paperclip, Square } from 'lucide-react'

import { cn } from '~/lib/utils'
import CircularProgress from '~/components/ui/circular-progress'
import ExcelIcon from '~/assets/iconify/vscode-icons/file-type-excel.svg?react'

import type { FileItem } from '~/components/file-item-badge'

export interface TaskInputBoxProps {
  className?: string
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  /** 中止处理回调 */
  onStop?: () => void
  files?: FileItem[]
  onAddFiles?: (files: File[]) => void
  onRemoveFile?: (index: number) => void
  onRetryFile?: (index: number) => void
  disabled?: boolean
  isProcessing?: boolean
  canSubmit?: boolean
  placeholder?: string
  acceptFileTypes?: string
  /** 底部工具栏左侧扩展区域（如模型选择器） */
  toolbarLeft?: React.ReactNode
}

export interface TaskInputBoxRef {
  focus: () => void
  getTextarea: () => HTMLTextAreaElement | null
}

/**
 * 任务输入框组件
 *
 * 功能特性：
 * - 一体化卡片式输入框
 * - 文件上传（拖拽、粘贴、点击图标）
 * - 文件标签内嵌显示
 * - 底部工具栏（左侧扩展 + 右侧发送）
 */
const TaskInput = forwardRef<TaskInputBoxRef, TaskInputBoxProps>(({
  value,
  onChange,
  onSubmit,
  onStop,
  files = [],
  onAddFiles,
  onRemoveFile,
  onRetryFile,
  disabled = false,
  isProcessing = false,
  canSubmit = true,
  placeholder = '描述你的处理需求...',
  acceptFileTypes = '.xlsx,.xls,.csv',
  toolbarLeft,
  className,
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    getTextarea: () => textareaRef.current,
  }))

  // 是否有文件
  const hasFiles = files.length > 0

  // 处理键盘提交
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && canSubmit && !disabled && !isProcessing) {
      e.preventDefault()
      onSubmit()
    }
  }, [canSubmit, disabled, isProcessing, onSubmit])

  // 处理粘贴
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items || !onAddFiles) return

    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file && isExcelFile(file)) {
          files.push(file)
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault()
      onAddFiles(files)
    }
  }, [onAddFiles])

  // 处理拖放
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!onAddFiles || disabled) return

    const droppedFiles = Array.from(e.dataTransfer.files).filter(isExcelFile)
    if (droppedFiles.length > 0) {
      onAddFiles(droppedFiles)
    }
  }, [onAddFiles, disabled])

  // 处理拖放悬停
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  // 触发文件选择
  const triggerFileSelect = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }, [disabled])

  // 处理文件选择
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []).filter(isExcelFile)
    if (selectedFiles.length > 0 && onAddFiles) {
      onAddFiles(selectedFiles)
    }
    // 清空 input 以允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onAddFiles])

  return (
    <div className={cn("space-y-2", className)}>
      {/* 文件标签列表（在输入框上方） */}
      {hasFiles && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {files.map((fileItem, idx) => (
            <FileTag
              key={idx}
              fileItem={fileItem}
              onRemove={() => onRemoveFile?.(idx)}
              onRetry={() => onRetryFile?.(idx)}
              disabled={disabled || isProcessing}
            />
          ))}
        </div>
      )}

      {/* 输入框卡片 */}
      <div
        className={cn(
          "relative rounded-2xl border-2 border-border bg-card shadow-sm transition-all",
          "focus-within:border-brand focus-within:shadow-md focus-within:shadow-brand/10",
          disabled && "opacity-60"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* 内容区域 */}
        <div className="px-4 pt-4 pb-2">
          {/* 文本输入（无边框） */}
          <textarea
            ref={textareaRef}
            rows={2}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled || isProcessing}
            className={cn(
              "w-full resize-none bg-transparent text-sm text-foreground outline-none",
              "placeholder:text-muted-foreground",
              "disabled:cursor-not-allowed"
            )}
          />
        </div>

        {/* 底部工具栏 */}
        <div className="flex items-center justify-between px-3 pb-3">
          {/* 左侧工具按钮 */}
          <div className="flex items-center gap-1">
            {/* 上传文件按钮 */}
            {onAddFiles && (
              <button
                onClick={triggerFileSelect}
                disabled={disabled || isProcessing}
                className={cn(
                  "p-2 rounded-lg text-muted-foreground transition-colors",
                  "hover:bg-muted hover:text-foreground",
                  (disabled || isProcessing) && "cursor-not-allowed opacity-50"
                )}
                title="上传文件"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            )}

            {/* 扩展区域（模型选择等） */}
            {toolbarLeft}
          </div>

          {/* 发送/中止按钮 */}
          {isProcessing && onStop ? (
            <button
              onClick={onStop}
              className="p-2 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all"
              title="中止"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={!canSubmit || disabled}
              className={cn(
                "p-2 rounded-full transition-all",
                canSubmit && !disabled
                  ? "bg-brand text-brand-foreground hover:bg-brand-dark"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              title="发送"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 隐藏的文件输入 */}
        <input
          multiple
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={acceptFileTypes}
          disabled={disabled || isProcessing}
        />
      </div>
    </div>
  )
})

TaskInput.displayName = 'TaskInputBox'

/** 判断是否为 Excel 文件 */
function isExcelFile(file: File): boolean {
  return file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')
}

/** 文件标签组件（统一样式，支持不同状态） */
const FileTag = ({
  fileItem,
  onRemove,
  onRetry,
  disabled,
}: {
  fileItem: FileItem
  onRemove: () => void
  onRetry?: () => void
  disabled?: boolean
}) => {
  const isUploading = fileItem.status === 'uploading'
  const isError = fileItem.status === 'error'
  const isSuccess = fileItem.status === 'success'

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 text-xs font-medium rounded-lg border shadow-sm bg-card transition-all",
        isSuccess && "border-brand/30 text-brand-dark bg-brand-muted/50",
        isUploading && "border-border text-muted-foreground",
        isError && "border-error/30 text-error bg-error/5"
      )}
    >
      {/* 文件图标 */}
      <ExcelIcon className={cn(
        "w-3.5 h-3.5 shrink-0",
        isSuccess && "text-brand",
        isUploading && "text-muted-foreground",
        isError && "text-error"
      )} />

      {/* 文件名 */}
      <span className="max-w-[120px] truncate">{fileItem.file.name}</span>

      {/* 状态操作区 */}
      {isUploading && (
        <CircularProgress
          progress={fileItem.progress || 0}
          size={14}
          strokeWidth={2}
          className="shrink-0"
        />
      )}

      {isError && onRetry && (
        <button
          onClick={onRetry}
          className="p-0.5 rounded-md hover:bg-error/10 text-error transition-colors"
          title="重试"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}

      {(isSuccess || isError) && !disabled && (
        <button
          onClick={onRemove}
          className={cn(
            "p-0.5 rounded-md transition-colors",
            isSuccess && "hover:bg-brand/10 text-brand-dark/60 hover:text-error",
            isError && "hover:bg-error/10 text-error/70 hover:text-error"
          )}
          title="移除"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}

export default TaskInput
