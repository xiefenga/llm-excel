import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router'
import { ChevronLeft } from 'lucide-react'

import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '~/components/ui/resizable'
import { runFixtureCase, getFixtureScenario } from '~/lib/api'

import FixturePreviewPanel from './fixture-preview-panel'
import FixtureExecutionPanel from './fixture-execution-panel'

import type { FixtureSSEStep, FixtureSSEComplete, FixtureSSEError, FixtureCaseSummary, FixtureDataset } from '~/lib/api'
import type { FixtureStepRecord } from './fixture-step-item'
import type { PreviewTab, OutputFileInfo } from './fixture-preview-panel'

export interface FixtureWorkbenchProps {
  scenarioId: string
  caseId: string
}

/**
 * Fixture 测试工作台主容器
 * 
 * 包含：
 * - 顶部：导航和标题
 * - 左侧：数据集预览面板
 * - 右侧：执行面板（用例信息、步骤、结果）
 */
const FixtureWorkbench = ({ scenarioId, caseId }: FixtureWorkbenchProps) => {
  // 用例信息
  const [caseInfo, setCaseInfo] = useState<FixtureCaseSummary | null>(null)
  const [datasets, setDatasets] = useState<FixtureDataset[]>([])
  const [scenarioName, setScenarioName] = useState<string>('')
  const [loadingCase, setLoadingCase] = useState(true)

  // 执行状态
  const [isRunning, setIsRunning] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [steps, setSteps] = useState<FixtureStepRecord[]>([])
  const [result, setResult] = useState<FixtureSSEComplete | null>(null)
  const [outputFiles, setOutputFiles] = useState<OutputFileInfo[]>([])
  const [previewTab, setPreviewTab] = useState<PreviewTab>('input')

  // Refs
  const stepIdRef = useRef(0)
  const abortRef = useRef<(() => void) | null>(null)
  const stageIdStepMapRef = useRef<Record<string, number>>({})

  // 加载用例信息
  useEffect(() => {
    if (!scenarioId || !caseId) return

    const fetchCase = async () => {
      try {
        setLoadingCase(true)
        const scenario = await getFixtureScenario(scenarioId)
        const foundCase = scenario.cases.find((c) => c.id === caseId)
        if (foundCase) {
          setCaseInfo(foundCase)
        }
        setDatasets(scenario.datasets || [])
        setScenarioName(scenario.name || '')
      } catch (err) {
        console.error('Failed to load case info:', err)
      } finally {
        setLoadingCase(false)
      }
    }
    fetchCase()
  }, [scenarioId, caseId])

  // 处理 step 事件
  const handleStepEvent = useCallback((data: FixtureSSEStep) => {
    // 检查是否是 complete 步骤（后端将 complete 作为步骤事件发送）
    if (data.step === 'complete' && data.status === 'done' && data.output) {
      const output = data.output as { success: boolean; errors?: string[] }
      setResult({
        success: output.success,
        errors: output.errors,
      })
      return
    }

    // 检查是否是 export 步骤完成，提取输出文件
    if (data.step === 'export' && data.status === 'done' && data.output) {
      const output = data.output as { output_files?: OutputFileInfo[] }
      if (output.output_files && output.output_files.length > 0) {
        setOutputFiles(output.output_files)
        // 自动切换到输出 Tab
        setPreviewTab('output')
      }
    }

    const stageId = data.stage_id || `${data.step}-${Date.now()}`

    setSteps((prev) => {
      const existingStepId = stageIdStepMapRef.current[stageId]
      const existingIndex = prev.findIndex((step) => step.id === existingStepId)

      if (existingIndex >= 0) {
        // 更新已有条目
        const existingStep = prev[existingIndex]
        const updatedStep: FixtureStepRecord = { ...existingStep }

        if (data.status === 'streaming' && data.delta) {
          updatedStep.status = 'streaming'
          updatedStep.streamingContent = (existingStep.streamingContent || '') + data.delta
        } else if (data.status === 'done') {
          updatedStep.status = 'done'
          updatedStep.completedAt = new Date()
          updatedStep.output = data.output
        } else if (data.status === 'error') {
          updatedStep.status = 'error'
          updatedStep.completedAt = new Date()
          updatedStep.error = data.error
        }

        return [...prev.slice(0, existingIndex), updatedStep, ...prev.slice(existingIndex + 1)]
      } else {
        // 创建新条目
        const newId = ++stepIdRef.current
        stageIdStepMapRef.current[stageId] = newId

        const newStep: FixtureStepRecord = {
          id: newId,
          step: data.step,
          stageId: stageId,
          status: data.status === 'streaming' ? 'streaming' : data.status,
          startedAt: new Date(),
          streamingContent: data.status === 'streaming' ? data.delta : undefined,
          output: data.status === 'done' ? data.output : undefined,
          error: data.status === 'error' ? data.error : undefined,
          completedAt: data.status === 'done' || data.status === 'error' ? new Date() : undefined,
        }

        return [...prev, newStep]
      }
    })
  }, [])

  // 开始运行测试
  const handleRun = useCallback(() => {
    if (!scenarioId || !caseId) return

    setIsRunning(true)
    setHasStarted(true)
    setSteps([])
    setResult(null)
    setOutputFiles([])
    setPreviewTab('input')
    stepIdRef.current = 0
    stageIdStepMapRef.current = {}

    const process = runFixtureCase({
      scenarioId,
      caseId,
      events: {
        onMeta: () => {
          // meta 事件已废弃，忽略
        },
        onStep: handleStepEvent,
        onComplete: (data) => {
          setResult(data)
        },
        onError: (data: FixtureSSEError) => {
          console.error('Fixture error:', data.message)
        },
        onFinally: () => {
          setIsRunning(false)
        },
      },
    })

    abortRef.current = process.abort
  }, [scenarioId, caseId, handleStepEvent])

  // 停止运行
  const handleStop = useCallback(() => {
    abortRef.current?.()
    setIsRunning(false)
  }, [])

  // 组件卸载时停止
  useEffect(() => {
    return () => {
      abortRef.current?.()
    }
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* 顶部导航栏 */}
      <div className="shrink-0 px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3">
        <Link 
          to={`/fixtures/${scenarioId}`} 
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {scenarioName && (
              <>
                <span className="text-sm text-gray-500">{scenarioName}</span>
                <span className="text-gray-300">/</span>
              </>
            )}
            <h1 className="text-base font-semibold text-gray-900 truncate">
              {caseInfo?.name || '测试用例'}
            </h1>
          </div>
          <p className="text-xs text-gray-400 font-mono">
            {scenarioId} / {caseId}
          </p>
        </div>
      </div>

      {/* 主内容区 - 双面板布局 */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* 左侧：数据集预览面板 */}
          <ResizablePanel defaultSize={55} minSize={35}>
            <FixturePreviewPanel
              datasets={datasets}
              scenarioId={scenarioId}
              outputFiles={outputFiles}
              isProcessing={isRunning}
              isLoading={loadingCase}
              activeTab={previewTab}
              onTabChange={setPreviewTab}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* 右侧：执行面板 */}
          <ResizablePanel defaultSize={45} minSize={30}>
            <FixtureExecutionPanel
              caseInfo={caseInfo}
              datasets={datasets}
              isLoadingCase={loadingCase}
              steps={steps}
              result={result}
              isRunning={isRunning}
              hasStarted={hasStarted}
              onRun={handleRun}
              onStop={handleStop}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}

export default FixtureWorkbench
