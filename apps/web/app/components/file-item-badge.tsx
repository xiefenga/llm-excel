import { X } from 'lucide-react'
import { match } from 'ts-pattern'

import CircularProgress from '~/components/ui/circular-progress'

import ExcelIcon from '~/assets/iconify/vscode-icons/file-type-excel.svg?react'

export type FileUploadStatus = "uploading" | "success" | "error";

export interface FileItem {
  file: File;
  status: FileUploadStatus;
  progress: number; // 0-100
  fileId?: string; // 上传成功后的 file_id
  path?: string; // 文件路径
  error?: string; // 错误信息
}

interface Props {
  fileItem: FileItem
  onClick?: (fileId: string) => void
  onRemove?: (fileId: string) => void
}

export type FileItemBadgeProps = Props

const FileItemBadge = ({ onClick, fileItem, onRemove }: Props) => {

  return (
    <div className="flex items-center select-none border border-brand p-1 rounded gap-0.5 group relative" onClick={() => fileItem.fileId && onClick?.(fileItem.fileId)}>
      <ExcelIcon className="w-4 h-4 shrink-0" />
      <span className="text-xs max-w-[120px] truncate cursor-pointer">
        {fileItem.file.name}
      </span>
      {/* 圆形上传进度 / 删除按钮 */}
      <div className="flex items-center justify-center shrink-0">
        {match(fileItem.status)
          .with("uploading", () => (
            <CircularProgress progress={fileItem.progress} size={12} />
          ))
          .with("error", () => (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-error max-w-[60px] truncate" title={fileItem.error}>
                {fileItem.error || "失败"}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileItem.fileId && onRemove?.(fileItem.fileId)
                }}
                className="w-4 h-4 flex items-center justify-center rounded hover:bg-error/10 transition-colors"
                title="删除"
              >
                <X className="w-3 h-3 text-error" />
              </button>
            </div>
          ))
          .with("success", () =>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileItem.fileId && onRemove?.(fileItem.fileId)
              }}
              className="w-4 h-4 flex items-center justify-center rounded hover:bg-error/10 transition-colors cursor-pointer"
              title="删除"
            >
              <X className="w-3 h-3 text-gray-500 hover:text-error" />
            </button>
          )
          .exhaustive()}
      </div>
    </div>
  );
}

export default FileItemBadge
