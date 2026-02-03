import ExcelIcon from '~/assets/iconify/vscode-icons/file-type-excel.svg?react'

export type FileUploadStatus = "uploading" | "success" | "error";

export interface FileItem {
  id: string
  filename: string
  path: string
}

interface Props {
  file: FileItem
  onClick?: (fileId: string) => void
}

export type FileItemBadgeProps = Props

const FileItemBadge = ({ onClick, file }: Props) => {

  return (
    <div className="flex items-center select-none border border-brand p-1 rounded gap-0.5 hover:bg-warning/10 cursor-pointer" onClick={() => onClick?.(file.id)}>
      <ExcelIcon className="w-4 h-4 shrink-0" />
      <span className="text-xs max-w-[120px] truncate">
        {file.filename}
      </span>
    </div>
  );
}

export default FileItemBadge
