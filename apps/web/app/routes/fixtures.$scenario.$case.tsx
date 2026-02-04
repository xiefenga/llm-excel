import { useParams } from 'react-router'

import FixtureWorkbench from '~/features/fixture/fixture-workbench'

/**
 * Fixture 测试用例运行页面
 * 
 * 路由: /fixtures/:scenario/:case
 */
const FixtureCasePage = () => {
  const { scenario: scenarioId, case: caseId } = useParams()

  if (!scenarioId || !caseId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-gray-500">无效的测试用例路径</p>
      </div>
    )
  }

  return <FixtureWorkbench scenarioId={scenarioId} caseId={caseId} />
}

export default FixtureCasePage
