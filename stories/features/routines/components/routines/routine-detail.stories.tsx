import type { Meta, StoryObj } from '@storybook/react';
import { RoutineDetail } from '@/features/routines/components/routines/routine-detail';
import { mockRoutineDetail, mockProposedEvents, mockExistingEvents } from '../../../../routine-fixtures';
import { stubApplyRoutine, stubForkRoutine, stubToggleVisibility } from '../../../../routine-action-stubs';
import type { RoutineAiWorkflowResult } from '@/features/ai/types';

const mockWorkflow: RoutineAiWorkflowResult = {
  profile: {
    agent: 'bedrock/profile-agent',
    generatedAt: new Date().toISOString(),
    data: {
      persona: '集中を重視するユーザー',
      highlightedConstraints: ['週内の出張', '朝の家庭タスク'],
      toneGuidance: '落ち着いた口調'
    }
  },
  interpretation: {
    agent: 'bedrock/routine-interpreter-agent',
    generatedAt: new Date().toISOString(),
    data: {
      intent: '集中ブロックと回復ブロックを交互に置き、成果と余白を両立する',
      successSignals: ['午前の集中時間', '午後のレビュー'],
      riskSignals: ['週前半に負荷が集中']
    }
  },
  conflicts: {
    agent: 'bedrock/calendar-conflict-agent',
    generatedAt: new Date().toISOString(),
    data: {
      conflicts: [
        {
          id: 'early-start',
          label: '早朝の準備時間と衝突',
          severity: 'medium',
          rationale: '月曜 8:00 開始のため通勤と衝突する恐れ'
        }
      ],
      assumptions: ['出張日は手動で再配置']
    }
  },
  optimizations: {
    agent: 'bedrock/optimization-agent',
    generatedAt: new Date().toISOString(),
    data: {
      proposals: [
        {
          id: 'buffer',
          title: '確認バッファを追加',
          description: 'カレンダー反映前に 24 時間の手動確認を挟む',
          tradeOffs: ['決裁に時間がかかる'],
          aiOnly: false
        }
      ]
    }
  },
  futureSimulation: {
    agent: 'bedrock/future-simulation-agent',
    generatedAt: new Date().toISOString(),
    data: {
      outlook: '提案を採用すると集中時間の確保が安定',
      guardrails: ['AI 提案は必ず人が確認', '衝突解決までは書き込まない'],
      followUpQuestions: ['最近の制約は変化していないか？']
    }
  },
  evaluation: {
    agent: 'llm-judge',
    generatedAt: new Date().toISOString(),
    data: {
      clarity: { score: 4, rationale: '制約を十分に反映' },
      consistency: { score: 3, rationale: '意図と提案が概ね一致' },
      explanationQuality: { score: 4, rationale: 'トレードオフが明記されている' },
      verdict: 'approve'
    }
  },
  meta: {
    executionId: 'story-exec',
    mastraTraceId: 'story-trace',
    proposalsOnly: true,
    langfuseTraceId: null
  }
};

const meta: Meta<typeof RoutineDetail> = {
  title: 'Routines/RoutineDetail',
  component: RoutineDetail,
  args: {
    routine: mockRoutineDetail,
    onToggleVisibility: stubToggleVisibility,
    onApplyRoutine: stubApplyRoutine,
    onForkRoutine: stubForkRoutine,
    calendarPlan: {
      proposedEvents: mockProposedEvents,
      existingEvents: mockExistingEvents,
      isCalendarConnected: true,
      aiAccess: { allowed: true, remaining: 1, limit: 1 }
    },
    workflow: mockWorkflow
  }
};

export default meta;

type Story = StoryObj<typeof RoutineDetail>;

export const Overview: Story = {};
