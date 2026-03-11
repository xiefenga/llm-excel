import test from 'node:test'
import assert from 'node:assert/strict'

import { getLatestOutputFilesFromTurns } from './history-output-files'

import type { ThreadTurn } from '~/lib/api'

test('returns the latest available exported files even when the newest turn has no export result', () => {
  const turns: ThreadTurn[] = [
    {
      id: 'turn-1',
      turn_number: 1,
      user_query: '处理这个文件',
      status: 'completed',
      steps: [
        {
          step: 'export',
          status: 'done',
          output: {
            output_files: [
              {
                file_id: 'file-1',
                filename: 'result.xlsx',
                url: '/outputs/result.xlsx',
              },
            ],
          },
        },
      ],
      created_at: '2026-03-11T10:00:00Z',
      completed_at: '2026-03-11T10:00:10Z',
    },
    {
      id: 'turn-2',
      turn_number: 2,
      user_query: '这个结果是什么意思？',
      status: 'completed',
      response_text: '我来解释一下',
      steps: [
        {
          step: 'chat',
          status: 'done',
        },
      ],
      created_at: '2026-03-11T10:01:00Z',
      completed_at: '2026-03-11T10:01:05Z',
    },
  ]

  assert.deepEqual(getLatestOutputFilesFromTurns(turns), [
    {
      file_id: 'file-1',
      filename: 'result.xlsx',
      url: '/outputs/result.xlsx',
    },
  ])
})

test('prefers the most recent exported files when multiple turns contain export results', () => {
  const turns: ThreadTurn[] = [
    {
      id: 'turn-1',
      turn_number: 1,
      user_query: '第一次处理',
      status: 'completed',
      steps: [
        {
          step: 'export',
          status: 'done',
          output: {
            output_files: [
              {
                file_id: 'file-1',
                filename: 'result-v1.xlsx',
                url: '/outputs/result-v1.xlsx',
              },
            ],
          },
        },
      ],
      created_at: '2026-03-11T10:00:00Z',
      completed_at: '2026-03-11T10:00:10Z',
    },
    {
      id: 'turn-2',
      turn_number: 2,
      user_query: '再次处理',
      status: 'completed',
      steps: [
        {
          step: 'export',
          status: 'done',
          output: {
            output_files: [
              {
                file_id: 'file-2',
                filename: 'result-v2.xlsx',
                url: '/outputs/result-v2.xlsx',
              },
            ],
          },
        },
      ],
      created_at: '2026-03-11T10:01:00Z',
      completed_at: '2026-03-11T10:01:10Z',
    },
  ]

  assert.deepEqual(getLatestOutputFilesFromTurns(turns), [
    {
      file_id: 'file-2',
      filename: 'result-v2.xlsx',
      url: '/outputs/result-v2.xlsx',
    },
  ])
})

test('returns an empty list when no turn has exported files', () => {
  const turns: ThreadTurn[] = [
    {
      id: 'turn-1',
      turn_number: 1,
      user_query: '你好',
      status: 'completed',
      response_text: '你好',
      steps: [
        {
          step: 'chat',
          status: 'done',
        },
      ],
      created_at: '2026-03-11T10:00:00Z',
      completed_at: '2026-03-11T10:00:05Z',
    },
  ]

  assert.deepEqual(getLatestOutputFilesFromTurns(turns), [])
})
