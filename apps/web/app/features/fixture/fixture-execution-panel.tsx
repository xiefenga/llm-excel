import { Fragment, useMemo, useRef, useEffect } from 'react'
import { Play, Loader2, Square, Sparkles, Lightbulb, ListChecks } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

import FixtureCaseCard from './fixture-case-card'
import FixtureStepItem from './fixture-step-item'
import FixtureResultCard from './fixture-result-card'

import type { FixtureCaseSummary, FixtureDataset, FixtureSSEComplete } from '~/lib/api'
import type { FixtureStepRecord } from './fixture-step-item'

export interface FixtureExecutionPanelProps {
  /** 用例信息 */
  caseInfo: FixtureCaseSummary | null
  /** 数据集列表 */
  datasets: FixtureDataset[]
  /** 是否正在加载用例信息 */
  isLoadingCase: boolean
  /** 执行步骤列表 */
  steps: FixtureStepRecord[]
  /** 执行结果 */
  result: FixtureSSEComplete | null
  /** 是否正在运行 */
  isRunning: boolean
  /** 是否已开始过运行 */
  hasStarted: boolean
  /** 开始运行回调 */
  onRun: () => void
  /** 停止运行回调 */
  onStop: () => void
}

/**
 * 右侧执行面板组件
 *
 * 包含：
 * - 用例信息卡片
 * - 执行步骤列表（滚动区域）
 * - 执行结果
 * - 底部控制按钮
 */
const FixtureExecutionPanel = ({
  caseInfo,
  datasets,
  isLoadingCase,
  steps,
  result,
  isRunning,
  hasStarted,
  onRun,
  onStop,
}: FixtureExecutionPanelProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  const executeInsights = useMemo(() => {
    const executeStep = [...steps]
      .reverse()
      .find((step) => step.step === 'execute' && step.status === 'done' && step.output)

    if (!executeStep?.output || typeof executeStep.output !== 'object') {
      return null
    }

    const output = executeStep.output as {
      strategy?: string
      manual_steps?: string
    }

    const strategy = typeof output.strategy === 'string' ? output.strategy : undefined
    const manualSteps = typeof output.manual_steps === 'string' ? output.manual_steps : undefined

    if (!strategy && !manualSteps) return null

    return { strategy, manualSteps }
  }, [steps])

  const lastExportStepId = useMemo(() => {
    const exportSteps = steps.filter((step) => step.step === 'export')
    if (exportSteps.length === 0) return null
    return exportSteps[exportSteps.length - 1].id
  }, [steps])

  const insightSection = executeInsights ? (
    <div className="space-y-3 pt-2">
      <h4 className="text-sm font-medium text-gray-500 px-1">执行解读</h4>
      {executeInsights.strategy && (
        <div className="rounded-xl border border-info/30 bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-info/10">
            <Lightbulb className="w-4 h-4 text-info" />
            <span className="text-sm font-medium text-info">思路解读</span>
          </div>
          <pre className="px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap font-sans">
            {executeInsights.strategy}
          </pre>
        </div>
      )}
      {executeInsights.manualSteps && (
        <div className="rounded-xl border border-warning/30 bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-warning/10">
            <ListChecks className="w-4 h-4 text-warning" />
            <span className="text-sm font-medium text-warning">手动操作步骤</span>
          </div>
          <pre className="px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap font-sans">
            {executeInsights.manualSteps}
          </pre>
        </div>
      )}
    </div>
  ) : null

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [steps])

  return (
    <div className="h-full flex flex-col bg-linear-to-br from-slate-50 via-white to-brand-muted/20">
      {/* 滚动内容区 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-4">
          {/* 用例信息 */}
          {isLoadingCase ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : caseInfo ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <FixtureCaseCard caseInfo={caseInfo} datasets={datasets} />
            </div>
          ) : null}

          {/* 空状态提示 */}
          {!hasStarted && !isLoadingCase && caseInfo && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-muted mb-3">
                <Sparkles className="w-7 h-7 text-brand" />
              </div>
              <h2 className="text-lg font-semibold text-gray-700 mb-1.5">
                准备就绪
              </h2>
              <p className="text-gray-500 text-sm">
                点击下方按钮开始运行测试
              </p>
            </div>
          )}

          {/* 执行步骤列表 */}
          {steps.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500 px-1">执行步骤</h3>
              {steps.map((step) => (
                <Fragment key={step.id}>
                  <FixtureStepItem record={step} />
                  {step.id === lastExportStepId && insightSection}
                </Fragment>
              ))}
              {!lastExportStepId && insightSection}
            </section>
          )}

          {/* 等待响应 */}
          {hasStarted && steps.length === 0 && isRunning && (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              等待服务器响应...
            </div>
          )}

          {/* 执行结果 */}
          {result && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500 px-1">执行结果</h3>
              <FixtureResultCard result={result} />
            </section>
          )}

          {/* 未完成提示 */}
          {!result && hasStarted && !isRunning && steps.length > 0 && (
            <div className="bg-warning/10 rounded-xl border border-warning/20 p-4 text-center">
              <p className="text-sm text-warning">测试未完成</p>
            </div>
          )}
        </div>
      </div>

      {/* 底部控制区 */}
      <div className="shrink-0 p-4 pt-3 bg-white/80 backdrop-blur-sm border-t border-gray-100">
        {isRunning ? (
          <Button
            variant="destructive"
            className="w-full"
            onClick={onStop}
          >
            <Square className="w-4 h-4 mr-2" />
            停止运行
          </Button>
        ) : (
          <Button
            className={cn(
              "w-full",
              "bg-brand hover:bg-brand-dark text-white"
            )}
            onClick={onRun}
            disabled={!caseInfo || isLoadingCase}
          >
            <Play className="w-4 h-4 mr-2" />
            {hasStarted ? '重新运行' : '运行测试'}
          </Button>
        )}
      </div>
    </div>
  )
}

export default FixtureExecutionPanel
