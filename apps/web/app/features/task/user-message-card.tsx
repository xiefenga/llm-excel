import dayjs from 'dayjs'
import { useState } from 'react'
import { User, Copy, Check, Clock } from 'lucide-react'

import ExcelIcon from '~/assets/iconify/vscode-icons/file-type-excel.svg?react'

import { cn } from '~/lib/utils'

import type { UserMessageAttachment } from '~/components/llm-chat/message-list/types'

export interface UserMessageCardProps {
  content: string
  files?: UserMessageAttachment[]
  timestamp: number
  avatar?: string
  className?: string
}

/**
 * 用户消息卡片组件
 *
 * 显示用户发送的任务消息，包含：
 * - 用户头像（右侧）
 * - 文件标签
 * - 消息内容
 * - 时间戳
 * - 复制按钮
 */
const UserMessageCard = ({ content, files = [], timestamp, avatar, className }: UserMessageCardProps) => {
  const [copied, setCopied] = useState(false)

  // 复制消息内容
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className={cn("flex gap-1", className)}>
      {/* 消息内容区（左侧，占据大部分空间） */}
      <div className="flex-1 min-w-0 flex flex-col items-end space-y-2">
        {/* 附件文件列表 */}
        {files.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1.5">
            {files.map((file) => (
              <span
                key={file.id}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-brand-muted/50 text-brand-dark"
              >
                <ExcelIcon className="w-3 h-3" />
                <span className="max-w-[100px] truncate">{file.filename}</span>
              </span>
            ))}
          </div>
        )}

        {/* 消息气泡 */}
        <div className="bg-brand-muted/40 rounded-xl rounded-tr-sm px-4 py-3 shadow-sm border border-brand/10 max-w-full">
          <p className="text-sm text-gray-800 whitespace-pre-wrap wrap-break-word">
            {content}
          </p>
        </div>

        {/* 底部 */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{dayjs.unix(timestamp).format('YYYY-MM-DD HH:mm')}</span>
          </div>
          <button
            onClick={onCopy}
            className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded transition-all",
              "hover:bg-gray-100 hover:text-gray-600",
              copied && "text-brand"
            )}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                <span>已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>复制</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 用户头像（右侧） */}
      <div className="shrink-0 w-6 h-6 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
        {avatar ? (
          <img src={avatar} className="w-full h-full object-cover" />
        ) : (
          <User className="w-3.5 h-3.5 text-gray-400" />
        )}
      </div>
    </div>
  )
}

export default UserMessageCard
