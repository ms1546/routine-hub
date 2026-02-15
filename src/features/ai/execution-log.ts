import { PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBDocumentClient, AI_EXECUTION_LOGS_TABLE } from '@/infrastructure/db/dynamodb-client';
import { createDefaultUUIDGenerator } from '@/shared/utils/uuid';
import type { Routine } from '@/features/routines';
import type { RoutineAiWorkflowResult } from './types';
import type { AuthenticatedUser } from '@/infrastructure/auth/session';
import type { ExecutionRecord, ExecutionStatus, HumanEvaluation } from './execution-log-types';

const generateUUID = createDefaultUUIDGenerator();

// In-memory cache for quick access (最新50件のみ)
const executionRecordsCache: ExecutionRecord[] = [];
const MAX_CACHE_SIZE = 50;

// User execution counts cache (DynamoDBから読み込む)
const userExecutionCountsCache = new Map<string, number>();
const MAX_NON_ADMIN_EXECUTIONS = 1;
const isTestEnvironment =
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST === 'true' ||
  typeof (globalThis as { vi?: unknown }).vi !== 'undefined';
const isExecutionLogMocked =
  isTestEnvironment ||
  process.env.MASTRA_USE_MOCK === 'true' ||
  !process.env.AWS_ACCESS_KEY_ID;

/**
 * DynamoDBから実行記録を取得
 */
async function getExecutionRecordFromDB(executionId: string): Promise<ExecutionRecord | null> {
  if (isExecutionLogMocked) {
    return executionRecordsCache.find((record) => record.id === executionId) ?? null;
  }
  try {
    const result = await dynamoDBDocumentClient.send(
      new GetCommand({
        TableName: AI_EXECUTION_LOGS_TABLE,
        Key: { executionId }
      })
    );

    if (!result.Item) {
      return null;
    }

    // DynamoDBのItemをExecutionRecordに変換
    const item = result.Item as any;
    return {
      ...item,
      humanEvaluations: item.humanEvaluations || []
    } as ExecutionRecord;
  } catch (error) {
    console.error(`[execution-log.getExecutionRecordFromDB] Error:`, error);
    return null;
  }
}

/**
 * DynamoDBに実行記録を保存
 */
async function saveExecutionRecordToDB(record: ExecutionRecord): Promise<void> {
  if (isExecutionLogMocked) {
    executionRecordsCache.unshift(record);
    if (executionRecordsCache.length > MAX_CACHE_SIZE) {
      executionRecordsCache.pop();
    }
    return;
  }
  try {
    await dynamoDBDocumentClient.send(
      new PutCommand({
        TableName: AI_EXECUTION_LOGS_TABLE,
        Item: {
          ...record,
          // TTLを設定（90日後）
          ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60
        }
      })
    );

    // キャッシュに追加（最新50件のみ保持）
    executionRecordsCache.unshift(record);
    if (executionRecordsCache.length > MAX_CACHE_SIZE) {
      executionRecordsCache.pop();
    }
  } catch (error) {
    console.error(`[execution-log.saveExecutionRecordToDB] Error:`, error);
    throw error;
  }
}

/**
 * ユーザーの実行回数をDynamoDBから取得
 */
async function getUserExecutionCountFromDB(userId: string): Promise<number> {
  if (isExecutionLogMocked) {
    return userExecutionCountsCache.get(userId) ?? 0;
  }
  try {
    const result = await dynamoDBDocumentClient.send(
      new QueryCommand({
        TableName: AI_EXECUTION_LOGS_TABLE,
        IndexName: 'user-executed-at-index',
        KeyConditionExpression: 'userId = :userId',
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':userId': userId,
          ':status': 'success'
        },
        Select: 'COUNT'
      })
    );

    return result.Count || 0;
  } catch (error) {
    console.error(`[execution-log.getUserExecutionCountFromDB] Error:`, error);
    return 0;
  }
}

/**
 * ユーザーの実行回数を更新
 */
async function updateUserExecutionCount(userId: string, increment: number): Promise<void> {
  // キャッシュを更新
  const current = userExecutionCountsCache.get(userId) || 0;
  userExecutionCountsCache.set(userId, current + increment);
}

export function getExecutionRecords(limit = 50): ExecutionRecord[] {
  // キャッシュから返す（最新のもの）
  return executionRecordsCache.slice(0, limit);
}

export function resetExecutionLogForTests() {
  if (!isExecutionLogMocked) return;
  executionRecordsCache.length = 0;
  userExecutionCountsCache.clear();
}

export function getExecutionRecord(executionId: string): ExecutionRecord | undefined {
  // まずキャッシュを確認
  const cached = executionRecordsCache.find((record) => record.id === executionId);
  if (cached) {
    return cached;
  }

  // キャッシュにない場合はDynamoDBから取得（非同期だが、同期関数として扱う）
  // 実際の実装では、非同期関数にするか、事前にロードする必要がある
  return undefined;
}

export async function addHumanEvaluation(input: {
  executionId: string;
  reviewer: AuthenticatedUser;
  score: number;
  comment: string;
}): Promise<ExecutionRecord> {
  // DynamoDBから取得
  const record = await getExecutionRecordFromDB(input.executionId);
  if (!record) {
    throw new Error('Execution record not found');
  }

  const entry: HumanEvaluation = {
    id: generateUUID(),
    executionId: record.id,
    reviewerId: input.reviewer.id,
    reviewerName: input.reviewer.displayName,
    score: input.score,
    comment: input.comment,
    createdAt: new Date().toISOString()
  };

  record.humanEvaluations.unshift(entry);
  record.hasHumanEvaluation = true;

  // DynamoDBに更新
  try {
    await dynamoDBDocumentClient.send(
      new UpdateCommand({
        TableName: AI_EXECUTION_LOGS_TABLE,
        Key: { executionId: record.id },
        UpdateExpression: 'SET humanEvaluations = :evals, hasHumanEvaluation = :hasEval',
        ExpressionAttributeValues: {
          ':evals': record.humanEvaluations,
          ':hasEval': true
        }
      })
    );
  } catch (error) {
    console.error(`[execution-log.addHumanEvaluation] Error:`, error);
    throw error;
  }

  // キャッシュを更新
  const cacheIndex = executionRecordsCache.findIndex((r) => r.id === record.id);
  if (cacheIndex >= 0) {
    executionRecordsCache[cacheIndex] = record;
  }

  return record;
}

const getAverageJudgeScore = (result: RoutineAiWorkflowResult): number => {
  const { clarity, consistency, explanationQuality } = result.evaluation.data;
  const total = clarity.score + consistency.score + explanationQuality.score;
  return Math.round((total / 3) * 10) / 10;
};

export async function recordWorkflowSuccess(input: {
  result: RoutineAiWorkflowResult;
  workflowName: string;
  routine: Routine;
  user: AuthenticatedUser;
}): Promise<ExecutionRecord> {
  const record: ExecutionRecord = {
    id: input.result.meta.executionId,
    workflowName: input.workflowName,
    routineId: input.routine.id,
    routineName: input.routine.name,
    triggeredBy: input.user.displayName,
    triggeredByEmail: input.user.email,
    userId: input.user.id, // DynamoDB用に追加
    status: 'success',
    executedAt: new Date().toISOString(),
    judgeScore: getAverageJudgeScore(input.result),
    judgeVerdict: input.result.evaluation.data.verdict,
    hasHumanEvaluation: false,
    humanEvaluations: [],
    langfuseTraceId: input.result.meta.langfuseTraceId ?? undefined
  };

  // DynamoDBに保存
  await saveExecutionRecordToDB(record);

  // ユーザーの実行回数を更新
  await updateUserExecutionCount(input.user.id, 1);

  return record;
}

export async function recordWorkflowFailure(input: {
  workflowName: string;
  routine: Routine;
  user: AuthenticatedUser;
  error: Error;
}): Promise<ExecutionRecord> {
  const record: ExecutionRecord = {
    id: generateUUID(),
    workflowName: input.workflowName,
    routineId: input.routine.id,
    routineName: input.routine.name,
    triggeredBy: input.user.displayName,
    triggeredByEmail: input.user.email,
    userId: input.user.id, // DynamoDB用に追加
    status: 'failure',
    executedAt: new Date().toISOString(),
    failureReason: input.error.message,
    hasHumanEvaluation: false,
    humanEvaluations: []
  };

  // DynamoDBに保存
  await saveExecutionRecordToDB(record);

  // 失敗でも実行回数はカウントする
  await updateUserExecutionCount(input.user.id, 1);

  return record;
}

export async function getExecutionLimit(user: AuthenticatedUser): Promise<{ limit: number | null; used: number; remaining: number | null }> {
  if (user.role === 'admin') {
    return { limit: null, used: 0, remaining: null };
  }

  // キャッシュから取得、なければDynamoDBから取得
  let used = userExecutionCountsCache.get(user.id);
  if (used === undefined) {
    used = await getUserExecutionCountFromDB(user.id);
    userExecutionCountsCache.set(user.id, used);
  }

  const remaining = Math.max(0, MAX_NON_ADMIN_EXECUTIONS - used);
  return { limit: MAX_NON_ADMIN_EXECUTIONS, used, remaining };
}

export async function canExecuteWorkflow(user: AuthenticatedUser): Promise<boolean> {
  if (user.role === 'admin') {
    return true;
  }

  const limit = await getExecutionLimit(user);
  return limit.remaining !== null && limit.remaining > 0;
}

export async function registerExecutionUsage(user: AuthenticatedUser): Promise<void> {
  if (user.role === 'admin') {
    return;
  }
  await updateUserExecutionCount(user.id, 1);
}

// Re-export types for convenience
export type { ExecutionRecord, ExecutionStatus, HumanEvaluation } from './execution-log-types';
