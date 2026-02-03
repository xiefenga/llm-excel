import { useState, useRef, useCallback } from 'react'
import { uploadFiles } from '~/lib/api'
import type { FileItem } from '~/components/file-item-badge'
import type { UserMessageAttachment } from '~/components/llm-chat/message-list/types'

export interface UseFileUploadOptions {
  /** 文件上传成功后的回调 */
  onUploadSuccess?: (files: UserMessageAttachment[]) => void
  /** 接受的文件类型 */
  accept?: string
}

export interface UseFileUploadReturn {
  /** 文件列表 */
  fileItems: FileItem[]
  /** 上传成功的文件列表（用于提交） */
  uploadedFiles: UserMessageAttachment[]
  /** 文件输入框 ref */
  fileInputRef: React.RefObject<HTMLInputElement | null>
  /** 是否有文件正在上传 */
  isUploading: boolean
  /** 上传多个文件 */
  uploadFilesBatch: (files: File[]) => Promise<void>
  /** 重试上传单个文件 */
  retryUploadFile: (index: number) => Promise<void>
  /** 删除文件（通过索引） */
  removeFile: (index: number) => void
  /** 删除文件（通过 fileId） */
  removeFileById: (fileId: string) => void
  /** 处理文件选择 */
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  /** 处理文件拖放 */
  handleDrop: (e: React.DragEvent) => Promise<void>
  /** 处理粘贴文件 */
  handlePasteFiles: (files: File[], e: React.ClipboardEvent) => Promise<void>
  /** 处理拖放悬停 */
  handleDragOver: (e: React.DragEvent) => void
  /** 触发文件选择 */
  triggerFileSelect: () => void
  /** 清空所有文件 */
  clearFiles: () => void
  /** 设置文件列表 */
  setFileItems: React.Dispatch<React.SetStateAction<FileItem[]>>
  /** 设置上传成功的文件列表 */
  setUploadedFiles: React.Dispatch<React.SetStateAction<UserMessageAttachment[]>>
  /** 从历史数据恢复文件列表（用于回填） */
  setFilesFromHistory: (files: UserMessageAttachment[]) => void
}

/** 判断是否为 Excel 文件 */
function isExcelFile(file: File): boolean {
  return file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')
}

/** 文件上传 Hook */
export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const { onUploadSuccess, accept = '.xlsx,.xls,.csv' } = options

  const [fileItems, setFileItems] = useState<FileItem[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UserMessageAttachment[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  // 用于跟踪当前文件数量，避免在 setState 回调中启动副作用
  const fileCountRef = useRef(0)

  // 同步更新 ref
  fileCountRef.current = fileItems.length

  // 计算是否有文件正在上传
  const isUploading = fileItems.some(item => item.status === 'uploading')

  // 上传单个文件
  const uploadSingleFile = useCallback(async (fileItem: FileItem, index: number) => {
    setFileItems(prev => {
      const updated = [...prev]
      updated[index] = { ...fileItem, status: 'uploading', progress: 0 }
      return updated
    })

    try {
      const result = await uploadFiles([fileItem.file], (progress) => {
        setFileItems(prev => {
          const updated = [...prev]
          if (updated[index]) {
            updated[index] = { ...updated[index], progress }
          }
          return updated
        })
      })

      if (result && result.length > 0) {
        setFileItems(prev => {
          const updated = [...prev]
          updated[index] = {
            ...updated[index],
            status: 'success',
            progress: 100,
            fileId: result[0].id,
            path: result[0].path,
          }
          return updated
        })

        const newFiles = result.map(item => ({
          id: item.id,
          path: item.path,
          filename: item.filename
        }))

        setUploadedFiles(prev => [...prev, ...newFiles])
        onUploadSuccess?.(newFiles)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '上传失败'
      setFileItems(prev => {
        const updated = [...prev]
        if (updated[index]) {
          updated[index] = {
            ...updated[index],
            status: 'error',
            error: errorMessage,
          }
        }
        return updated
      })
    }
  }, [onUploadSuccess])

  // 上传多个文件
  const uploadFilesBatch = useCallback(async (files: File[]) => {
    const excelFiles = files.filter(isExcelFile)
    if (excelFiles.length === 0) return

    // 使用 ref 获取当前文件数量作为起始索引
    const startIndex = fileCountRef.current

    const newFileItems: FileItem[] = excelFiles.map(file => ({
      file,
      status: 'uploading' as const,
      progress: 0,
    }))

    // 更新状态添加新文件
    setFileItems(prev => [...prev, ...newFileItems])

    // 启动上传（在 setState 外部）
    for (let i = 0; i < excelFiles.length; i++) {
      await uploadSingleFile(newFileItems[i], startIndex + i)
    }
  }, [uploadSingleFile])

  // 重试上传单个文件
  const retryUploadFile = useCallback(async (index: number) => {
    const fileItem = fileItems[index]
    if (fileItem) {
      await uploadSingleFile(fileItem, index)
    }
  }, [fileItems, uploadSingleFile])

  // 删除文件（通过索引）
  const removeFile = useCallback((index: number) => {
    const fileItem = fileItems[index]
    if (fileItem?.status === 'uploading') {
      return // 上传中的文件不能删除
    }

    // 从 uploadedFiles 中移除
    if (fileItem?.fileId) {
      setUploadedFiles(prev => prev.filter(f => f.id !== fileItem.fileId))
    }

    setFileItems(prev => prev.filter((_, idx) => idx !== index))
  }, [fileItems])

  // 删除文件（通过 fileId）
  const removeFileById = useCallback((fileId: string) => {
    const index = fileItems.findIndex(item => item.fileId === fileId)
    if (index !== -1) {
      removeFile(index)
    }
  }, [fileItems, removeFile])

  // 处理文件选择
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    await uploadFilesBatch(selectedFiles)

    // 清空 input 以允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [uploadFilesBatch])

  // 处理文件拖放
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const droppedFiles = Array.from(e.dataTransfer.files)
    await uploadFilesBatch(droppedFiles)
  }, [uploadFilesBatch])

  // 处理粘贴文件
  const handlePasteFiles = useCallback(async (files: File[], e: React.ClipboardEvent) => {
    const excelFiles = files.filter(isExcelFile)

    if (excelFiles.length > 0) {
      e.preventDefault()
      await uploadFilesBatch(excelFiles)
    }
  }, [uploadFilesBatch])

  // 处理拖放悬停
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  // 触发文件选择
  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // 清空所有文件
  const clearFiles = useCallback(() => {
    setFileItems([])
    setUploadedFiles([])
  }, [])

  // 从历史数据恢复文件列表（用于回填）
  const setFilesFromHistory = useCallback((files: UserMessageAttachment[]) => {
    // 创建模拟的 FileItem 用于显示
    const historyFileItems: FileItem[] = files.map(f => ({
      // 创建一个模拟的 File 对象，只用于显示文件名
      file: new File([], f.filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      status: 'success' as const,
      progress: 100,
      fileId: f.id,
      path: f.path,
    }))
    setFileItems(historyFileItems)
    setUploadedFiles(files)
  }, [])

  return {
    fileItems,
    uploadedFiles,
    fileInputRef,
    isUploading,
    uploadFilesBatch,
    retryUploadFile,
    removeFile,
    removeFileById,
    handleFileChange,
    handleDrop,
    handlePasteFiles,
    handleDragOver,
    triggerFileSelect,
    clearFiles,
    setFileItems,
    setUploadedFiles,
    setFilesFromHistory,
  }
}
