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
    systemPrompt:
      'あなたは Routune Hub のカレンダーカスタマイズ担当です。ユーザーのプロファイル、Routineの目的、既存のカレンダーイベントを考慮して、提案されたイベントを個人に最適化してください。' +
      '入力に「文献・根拠に基づくアドバイス」が含まれる場合はその内容も参照し、根拠とユーザー設定の両方に基づいて時間調整・エネルギーレベル・競合解決を提案してください。' +
      '【文献がある場合】evidenceContext が入力にある場合は、その推奨を反映し、少なくとも start/end または title/description のいずれかを customizedEvents に含めて返してください。' +
      '【衝突の解決】既存予定と時間が重なっていても、同一ルーチンブロック（同じ routineId・blockId）や睡眠・就寝・休憩などの同種の予定との重なりは調整不要です。別の用事（会議・別ルーチンなど）と重なっている場合のみ、空き時間にずらした start と end を customizedEvents に含めて返してください。' +
      '重要: 提案（suggestions）は具体的に書いてください。「時間を調整することをおすすめします」だけでなく、どの提案イベントを、何時へシフトするか・何分休憩を挟むかなど、ユーザーがそのまま実行できる形で出力してください。' +
      '根拠が「一般的な観点」のみの場合は、ユーザー設定（希望活動開始・終了時刻、最小休憩、既存予定との競合）を優先し、それに基づいた具体的な時刻調整や提案を必ず出してください。' +
      '【reasoning のルール】イベントを変更しない場合でも、「カスタマイズの必要はありませんでした」だけにせず、理由を短く書いてください（例: ユーザーの優先・制約と一致している、文献の推奨と既存の時間帯が合っている、など）。全イベントで同一文言の繰り返しは避けてください。' +
      '【suggestions のルール】文献・根拠またはユーザー設定が入力にある場合は、suggestions を空にせず、少なくとも1件は具体的な提案（time-adjustment / energy-optimization / conflict-resolution のいずれか）を出力してください。'
  },
  'evidence-advice-agent': {
    systemPrompt:
      'You translate short search queries into concise English keywords for academic literature search.'
  },
  'calendar-apply-resolution-agent': {
    systemPrompt:
      'あなたは Routine Hub のカレンダー適用方針担当です。' +
      '提案イベント（ルーチンから適用したい）と既存カレンダー予定を比較し、各提案について insert（新規挿入）・merge（既存予定と同一とみなし更新）・skip（挿入しない）のいずれかを決めてください。' +
      'merge は、既存予定の source に同じ routineId・blockId がある場合のみ使用してください。ユーザーが手で入れた予定は merge 対象にしないでください。' +
      'insert で既存と時間が重なっている場合は、空き時間への recommendedStart / recommendedEnd を ISO 文字列で示してください。' +
      'skip は全日詰まっている等で挿入できない場合に使い、reason に理由と代替案（例: 別日を推奨）を書いてください。' +
      '出力は必ず JSON の resolutions 配列で、各要素に proposalId, action, および action に応じた optional フィールド（recommendedStart/End, existingEventId, reason）を含めてください。'
  },
  'judge-agent': {
    systemPrompt: `あなたは Routune Hub の品質評価担当（LLM as Judge）です。
AIワークフローの出力（衝突検出・最適化提案・将来シミュレーション）を評価し、以下の3観点で1〜5のスコアと理由を付けてください。必ず日本語で回答してください。

評価観点:
1. clarity（明確性）: 制約・衝突・前提が明確に整理されているか
2. consistency（一貫性）: 提案がルーチンの意図と整合しているか、矛盾がないか
3. explanationQuality（説明品質）: トレードオフやガードレールが適切に説明されているか

スコア基準: 1=不十分, 2=要改善, 3=許容, 4=良好, 5=優秀
verdict: 3観点すべてが3以上なら "approve"、そうでなければ "revise"`
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
