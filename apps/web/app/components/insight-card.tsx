import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

import { cn } from '~/lib/utils'

export interface InsightCardProps {
  icon: React.ReactNode
  title: string
  content: string
  variant?: 'info' | 'warning' | 'success' | 'error'
  defaultExpanded?: boolean
}

const variantStyles = {
  info: {
    bg: 'bg-info/5',
    border: 'border-info/20',
    header: 'bg-info/10 hover:bg-info/15',
    icon: 'text-info',
    text: 'text-info',
  },
  warning: {
    bg: 'bg-warning/5',
    border: 'border-warning/20',
    header: 'bg-warning/10 hover:bg-warning/15',
    icon: 'text-warning',
    text: 'text-warning',
  },
  success: {
    bg: 'bg-brand/5',
    border: 'border-brand/20',
    header: 'bg-brand/10 hover:bg-brand/15',
    icon: 'text-brand',
    text: 'text-brand',
  },
  error: {
    bg: 'bg-error/5',
    border: 'border-error/20',
    header: 'bg-error/10 hover:bg-error/15',
    icon: 'text-error',
    text: 'text-error',
  },
}

/** 洞察卡片组件 - 用于显示可展开的详情信息 */
const InsightCard = ({
  icon,
  title,
  content,
  variant = 'info',
  defaultExpanded = false,
}: InsightCardProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const styles = variantStyles[variant]

  return (
    <div className={cn("rounded-lg border overflow-hidden", styles.border, styles.bg)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn("w-full flex items-center justify-between px-3 py-2.5 transition-colors", styles.header)}
      >
        <div className="flex items-center gap-2">
          <span className={styles.icon}>{icon}</span>
          <span className={cn("text-sm font-medium", styles.text)}>{title}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className={cn("w-4 h-4", styles.icon)} />
        ) : (
          <ChevronDown className={cn("w-4 h-4", styles.icon)} />
        )}
      </button>
      {isExpanded && (
        <pre className="text-sm p-3 whitespace-pre-wrap font-sans text-gray-700 bg-white/50">
          {content}
        </pre>
      )}
    </div>
  )
}

export default InsightCard
