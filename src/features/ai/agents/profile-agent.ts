import type { AgentResult, ProfileAgentData, UserProfileContext } from '../types';
import { profileAgentDataSchema } from '../schemas';
import { invokeBedrockWithFallback, isBedrockEnabled } from '../providers/bedrock';
import { getSystemPrompt } from '../evaluation/prompt-helper';

export type ProfileAgentInput = {
  userProfile: UserProfileContext;
};

export async function runProfileAgent({
  userProfile
}: ProfileAgentInput): Promise<AgentResult<ProfileAgentData>> {
const convertConstraints = (constraints: string[]) => (constraints.length ? constraints : ['制約は明示されていません']);
const fallbackData = (userProfile: UserProfileContext): ProfileAgentData => ({
  persona: `${userProfile.priorities[0] ?? '集中を重視する'}ユーザー。`,
  highlightedConstraints: convertConstraints(userProfile.constraints),
  toneGuidance:
    userProfile.energyLevel === 'high'
      ? '前向きな提案を行うが、必ず最終確認を依頼する。'
      : '落ち着いた口調で確認事項を明示する。'
});

  const fallback = fallbackData(userProfile);
  const systemPrompt = await getSystemPrompt('profile-agent');
  const data = await invokeBedrockWithFallback(
    {
      systemPrompt,
      userPrompt: `優先順位: ${userProfile.priorities.join(', ') || '未設定'}\n制約: ${
        userProfile.constraints.join(', ') || '未設定'
      }\nエネルギー: ${userProfile.energyLevel}\nタイムゾーン: ${userProfile.timezone}`,
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
