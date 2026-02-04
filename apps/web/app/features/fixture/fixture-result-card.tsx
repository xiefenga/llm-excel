import { CheckCircle, XCircle, Download, AlertCircle } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

import type { FixtureSSEComplete } from '~/lib/api'

export interface FixtureResultCardProps {
  result: FixtureSSEComplete
  className?: string
}

/**
 * 测试结果卡片组件
 * 
 * 显示测试执行的最终结果：
 * - 成功/失败状态
 * - 错误信息（如有）
 * - 输出文件下载链接
 */
const FixtureResultCard = ({ result, className }: FixtureResultCardProps) => {
  const isSuccess = result.success

  return (
    <div className={cn(
      "rounded-xl border p-4",
      isSuccess 
        ? "bg-brand/5 border-brand/20" 
        : "bg-error/5 border-error/20",
      className
    )}>
      {/* 状态头部 */}
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          isSuccess ? "bg-brand/10" : "bg-error/10"
        )}>
          {isSuccess ? (
            <CheckCircle className="w-5 h-5 text-brand" />
          ) : (
            <XCircle className="w-5 h-5 text-error" />
          )}
        </div>
        <div>
          <h3 className={cn(
            "font-semibold",
            isSuccess ? "text-brand-dark" : "text-error"
          )}>
            {isSuccess ? "测试通过" : "测试失败"}
          </h3>
          <p className="text-xs text-gray-500">
            {isSuccess ? "所有步骤执行成功" : "执行过程中出现错误"}
          </p>
        </div>
      </div>

      {/* 错误信息 */}
      {!isSuccess && result.errors && result.errors.length > 0 && (
        <div className="mb-3 space-y-2">
          {result.errors.map((error, index) => (
            <div 
              key={index}
              className="flex items-start gap-2 p-2 rounded-lg bg-error/10"
            >
              <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
              <p className="text-xs text-error break-all">{error}</p>
            </div>
          ))}
        </div>
      )}

      {/* 输出文件 */}
      {result.output_file && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/50">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700">结果文件</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            asChild
            className="text-brand border-brand/30 hover:bg-brand/10"
          >
            <a href={result.output_file} target="_blank" rel="noopener noreferrer">
              下载
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}

export default FixtureResultCard
