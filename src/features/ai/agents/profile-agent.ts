import type { AgentResult, ProfileAgentData, UserProfileContext } from '../types';
import { profileAgentDataSchema } from '../schemas';
import { invokeBedrockWithFallback, isBedrockEnabled } from '../providers/bedrock';
import { getSystemPrompt } from '../evaluation/prompt-helper';
import { userSettingsTool } from '../tools/user-settings-tool';

export type ProfileAgentInput = {
  /** 直接 UserProfileContext を渡す場合 */
  userProfile?: UserProfileContext;
  /** userId のみから Dynamo 経由で取得させたい場合 */
  userId?: string;
};

const convertConstraints = (constraints: string[]) =>
  constraints.length ? constraints : ['制約は明示されていません'];

const buildFallbackData = (userProfile: UserProfileContext): ProfileAgentData => ({
  persona: `${userProfile.priorities[0] ?? '集中を重視する'}ユーザー。`,
  highlightedConstraints: convertConstraints(userProfile.constraints),
  toneGuidance:
    userProfile.energyLevel === 'high'
      ? '前向きな提案を行うが、必ず最終確認を依頼する。'
      : '落ち着いた口調で確認事項を明示する。'
});

export async function runProfileAgent(input: ProfileAgentInput): Promise<AgentResult<ProfileAgentData>> {
  let userProfile = input.userProfile;

  // Tool 経由で User Settings を取得するパス
  if (!userProfile && input.userId) {
    userProfile = await userSettingsTool(input.userId);
  }

  if (!userProfile) {
    throw new Error('runProfileAgent requires either userProfile or userId.');
  }

  const fallback = buildFallbackData(userProfile);
  const systemPrompt = await getSystemPrompt('profile-agent');
  const data = await invokeBedrockWithFallback(
    {
      systemPrompt,
      userPrompt: `以下は DynamoDB（またはメモリストア）から取得したユーザー設定です。\nこれを前提にペルソナ・制約・トーンを要約してください。\n\n` +
        `優先順位: ${userProfile.priorities.join(', ') || '未設定'}\n制約: ${
          userProfile.constraints.join(', ') || '未設定'
        }\nエネルギー: ${userProfile.energyLevel}\nタイムゾーン: ${userProfile.timezone}${
          userProfile.requiredSleepHours != null ? `\n必要睡眠時間: ${userProfile.requiredSleepHours}時間` : ''
        }${userProfile.preferredWorkStartTime ? `\n希望活動開始: ${userProfile.preferredWorkStartTime}` : ''}${
          userProfile.preferredWorkEndTime ? `\n希望活動終了: ${userProfile.preferredWorkEndTime}` : ''
        }${
          userProfile.minBreakBetweenMinutes != null
            ? `\n連続イベント間最小休憩: ${userProfile.minBreakBetweenMinutes}分`
            : ''
        }`,
      schema: profileAgentDataSchema,
      shapeExample: JSON.stringify(fallback),
      temperature: 0.2
    },
    () => fallback
  );

  return {
    agent: isBedrockEnabled() ? 'bedrock/profile-agent' : 'heuristic/profile-agent',
    generatedAt: new Date().toISOString(),
    data
  };
}
