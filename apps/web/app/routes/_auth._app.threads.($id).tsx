import TaskWorkbench from '~/features/task/task-workbench'

import type { Route } from './+types/_auth._app.threads.($id)'

export function meta({ }: Route.MetaArgs) {
  return [
    { title: '任务处理 - Selgetabel' },
    { name: 'description', content: '使用 LLM 处理 Excel 数据' },
  ]
}

const ThreadPage = ({ params: { id: threadId } }: Route.ComponentProps) => {
  return <TaskWorkbench threadId={threadId} />
}

export default ThreadPage
