import { MessageSquare, Tag, FileSpreadsheet } from 'lucide-react'

import type { FixtureCaseSummary, FixtureDataset } from '~/lib/api'

export interface FixtureCaseCardProps {
  caseInfo: FixtureCaseSummary
  datasets?: FixtureDataset[]
  className?: string
}

/**
 * 用例信息卡片组件
 *
 * 显示测试用例的基本信息：
 * - Prompt 描述
 * - 标签列表
 * - 关联的数据集
 */
const FixtureCaseCard = ({ caseInfo, datasets = [], className }: FixtureCaseCardProps) => {
  return (
    <div className={className}>
      <div className="space-y-3">
        {/* Prompt */}
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-muted flex items-center justify-center shrink-0">
            <MessageSquare className="w-3.5 h-3.5 text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
              {caseInfo.prompt}
            </p>
          </div>
        </div>

        {/* Tags */}
        {caseInfo.tags && caseInfo.tags.length > 0 && (
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <Tag className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
              {caseInfo.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FixtureCaseCard
