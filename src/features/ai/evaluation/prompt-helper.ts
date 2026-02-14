import { getLangfusePrompt } from './langfuse-boundary';

/**
 * エージェント用のプロンプト定義
 */
export const AGENT_PROMPTS = {
  'profile-agent': {
    systemPrompt: 'あなたは Routune Hub のオペレーターです。必ず日本語で、ユーザーのペルソナと重要な制約、推奨トーンを記述してください。'
  },
  'routine-interpreter-agent': {
    systemPrompt: 'あなたは Routune Hub の分析担当です。ルーチンの意図、成功要因、リスク要因を必ず日本語で列挙してください。'
  },
  'calendar-conflict-agent': {
    systemPrompt: 'あなたは Routune Hub の衝突検出担当です。カレンダーウィンドウと意図を比較し、起こり得る衝突と必要な前提を日本語で列挙してください。'
  },
  'optimization-agent': {
    systemPrompt: 'あなたは Routune Hub のオプティマイザーです。人間の決裁を前提に、複数の提案とトレードオフを日本語で提示してください。'
  },
  'future-simulation-agent': {
    systemPrompt: 'あなたは Routune Hub のシミュレーション担当です。提案を採用した場合の見通し、ガードレール、フォローアップ質問を必ず日本語で回答してください。'
  },
  'calendar-customization-agent': {
    systemPrompt: 'あなたは Routune Hub のカレンダーカスタマイズ担当です。ユーザーのプロファイル、Routineの目的、既存のカレンダーイベントを考慮して、提案されたイベントを個人に最適化してください。時間調整、エネルギーレベルに基づく最適化、競合解決を提案してください。'
  }
} as const;

export type AgentPromptName = keyof typeof AGENT_PROMPTS;

/**
 * プロンプト情報（文字列 + バージョン情報）
 */
export type PromptInfo = {
  prompt: string;
  version?: number;
  labels?: string[];
  source: 'langfuse' | 'fallback';
};

/**
 * Langfuseからプロンプト情報を取得し、取得できない場合はフォールバックを使用
 * バージョン情報も含めて返す
 */
export async function getSystemPromptInfo(
  agentName: AgentPromptName,
  options?: {
    version?: number | 'latest';
    label?: string;
  }
): Promise<PromptInfo> {
  // 環境に応じたラベルを自動設定（指定されていない場合）
  // 開発環境: development、本番環境: production
  const defaultLabel = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  const label = options?.label ?? defaultLabel;

  // Langfuseからプロンプトを取得
  // label と version は同時に指定できないため、label が指定されている場合は version を undefined にする
  const langfusePrompt = await getLangfusePrompt({
    name: agentName,
    version: label ? undefined : (options?.version ?? 'latest'),
    label: label || undefined
  });

  if (langfusePrompt?.prompt) {
    return {
      prompt: langfusePrompt.prompt,
      version: langfusePrompt.version,
      labels: langfusePrompt.labels,
      source: 'langfuse'
    };
  }

  // フォールバック: コード内で定義されたプロンプト
  return {
    prompt: AGENT_PROMPTS[agentName].systemPrompt,
    source: 'fallback'
  };
}

/**
 * Langfuseからプロンプトを取得し、取得できない場合はフォールバックを使用
 * 文字列のみを返す（既存のAPIとの互換性のため）
 */
export async function getSystemPrompt(
  agentName: AgentPromptName,
  options?: {
    version?: number | 'latest';
    label?: string;
  }
): Promise<string> {
  const promptInfo = await getSystemPromptInfo(agentName, options);
  return promptInfo.prompt;
}
