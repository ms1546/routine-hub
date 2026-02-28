export type LangfuseTraceInput = {
  workflow: string;
  payload: unknown;
  traceId?: string;
};

export type LangfuseTraceResult = {
  traceId: string;
  recordedAt: string;
};

export type LangfuseTraceOutputInput = {
  traceId: string;
  output: unknown;
};

export type LangfuseScoreInput = {
  traceId: string;
  name: string;
  value: number;
  comment?: string;
  source?: 'MODEL' | 'HUMAN';
  metadata?: Record<string, unknown>;
};

export type LangfuseScoreResult = {
  scoreId: string;
  recordedAt: string;
};

export type LangfuseObservationInput = {
  traceId: string;
  type: 'EVENT' | 'SPAN' | 'GENERATION';
  name: string;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
};

export type LangfuseObservationResult = {
  observationId: string;
  recordedAt: string;
};

export type LangfusePromptInput = {
  name: string;
  version?: number | 'latest';
  label?: string;
};

export type LangfusePromptResult = {
  prompt: string;
  version?: number;
  labels?: string[];
};

type LangfusePrompt = {
  prompt: string;
  version?: number;
  labels?: string[];
};

type LangfuseClient = {
  trace: (payload: {
    id: string;
    name?: string;
    timestamp?: Date;
    input?: unknown;
    output?: unknown;
    metadata?: Record<string, unknown>;
  }) => Promise<unknown>;
  score: (payload: {
    traceId: string;
    name: string;
    value: number;
    comment?: string;
    source?: 'MODEL' | 'HUMAN';
    metadata?: Record<string, unknown>;
  }) => Promise<unknown>;
  observation: (payload: {
    traceId: string;
    type: 'EVENT' | 'SPAN' | 'GENERATION';
    name: string;
    input?: unknown;
    output?: unknown;
    metadata?: Record<string, unknown>;
  }) => Promise<unknown>;
  api?: {
    promptsGet?: (payload: {
      promptName: string;
      version?: number | 'latest';
      label?: string;
    }) => Promise<LangfusePrompt>;
  };
  prompts?: {
    getPrompt: (name: string, options?: {
      version?: number | 'latest';
      label?: string;
    }) => Promise<LangfusePrompt>;
  };
  getPrompt?: (name: string, options?: { version?: number | 'latest'; label?: string } | number | string) => Promise<LangfusePrompt>;
};

let langfuseClientPromise: Promise<LangfuseClient | null> | null = null;

async function getLangfuseClient(): Promise<LangfuseClient | null> {
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  if (!secretKey || !publicKey || process.env.LANGFUSE_DISABLE === 'true') {
    return null;
  }

  if (!langfuseClientPromise) {
    langfuseClientPromise = import('langfuse')
      .then((module) => {
        const LangfuseCtor = (module as { Langfuse?: any; default?: any }).Langfuse ?? (module as any).default;
        if (!LangfuseCtor) {
          console.warn('[RoutuneHub] Langfuse SDK not available, skipping trace export.');
          return null;
        }
        return new LangfuseCtor({
          baseUrl: process.env.LANGFUSE_BASE_URL ?? 'https://cloud.langfuse.com',
          secretKey,
          publicKey,
          release: process.env.VERCEL_GIT_COMMIT_SHA
        }) as LangfuseClient;
      })
      .catch((error) => {
        console.warn('[RoutuneHub] Failed to initialize Langfuse client.', error);
        return null;
      });
  }

  return langfuseClientPromise;
}

export async function recordLangfuseTrace(
  input: LangfuseTraceInput
): Promise<LangfuseTraceResult> {
  const traceId = input.traceId ?? `trace-${Buffer.from(input.workflow).toString('hex').slice(0, 8)}-${Date.now()}`;
  const recordedAt = new Date();
  try {
    const client = await getLangfuseClient();
    if (client) {
      // ペイロードからプロンプトバージョン情報を抽出（メタデータにも追加）
      const payload = input.payload as Record<string, unknown>;
      const promptVersions = payload?.promptVersions as Record<string, unknown> | undefined;

      await client.trace({
        id: traceId,
        name: input.workflow,
        timestamp: recordedAt,
        input: input.payload,
        metadata: {
          environment: process.env.NODE_ENV ?? 'development',
          ...(promptVersions && { promptVersions })
        }
      });
    }
  } catch (error) {
    console.warn('[RoutuneHub] Langfuse trace recording failed, continuing without telemetry.', error);
  }

  return {
    traceId,
    recordedAt: recordedAt.toISOString()
  };
}

/**
 * Trace の output を更新する。ワークフロー完了後に呼び出す。
 * 同じ traceId で trace を再送信し、Langfuse が既存 Trace にマージする（60日以内）。
 */
export async function updateLangfuseTraceOutput(
  input: LangfuseTraceOutputInput
): Promise<void> {
  try {
    const client = await getLangfuseClient();
    if (client) {
      await client.trace({
        id: input.traceId,
        output: input.output
      });
    }
  } catch (error) {
    console.warn('[RoutuneHub] Langfuse trace output update failed.', error);
  }
}

export async function recordLangfuseScore(
  input: LangfuseScoreInput
): Promise<LangfuseScoreResult> {
  const scoreId = `score-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const recordedAt = new Date();
  try {
    const client = await getLangfuseClient();
    if (client) {
      await client.score({
        traceId: input.traceId,
        name: input.name,
        value: input.value,
        comment: input.comment,
        source: input.source ?? 'MODEL',
        metadata: {
          ...input.metadata,
          environment: process.env.NODE_ENV ?? 'development'
        }
      });
    }
  } catch (error) {
    console.warn('[RoutuneHub] Langfuse score recording failed, continuing without telemetry.', error);
  }

  return {
    scoreId,
    recordedAt: recordedAt.toISOString()
  };
}

export async function recordLangfuseObservation(
  input: LangfuseObservationInput
): Promise<LangfuseObservationResult> {
  const observationId = `obs-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const recordedAt = new Date();
  try {
    const client = await getLangfuseClient();
    if (client) {
      await client.observation({
        traceId: input.traceId,
        type: input.type,
        name: input.name,
        input: input.input,
        output: input.output,
        metadata: {
          ...input.metadata,
          environment: process.env.NODE_ENV ?? 'development'
        }
      });
    }
  } catch (error) {
    console.warn('[RoutuneHub] Langfuse observation recording failed, continuing without telemetry.', error);
  }

  return {
    observationId,
    recordedAt: recordedAt.toISOString()
  };
}

export async function getLangfusePrompt(
  input: LangfusePromptInput
): Promise<LangfusePromptResult | null> {
  try {
    const client = await getLangfuseClient();
    if (!client) {
      return null;
    }

    let result: LangfusePrompt;
    const api = (client as { api?: { promptsGet?: (payload: { promptName: string; version?: number | 'latest'; label?: string }) => Promise<LangfusePrompt> } }).api;
    if (api?.promptsGet) {
      const query: { promptName: string; version?: number | 'latest'; label?: string } = {
        promptName: input.name
      };
      if (input.label) {
        query.label = input.label;
      } else if (input.version !== undefined) {
        query.version = input.version;
      } else {
        query.label = 'production';
      }
      result = await api.promptsGet(query);
    } else if (client.getPrompt) {
      if (input.label) {
        result = await client.getPrompt(input.name, input.label);
      } else if (input.version !== undefined) {
        result = await client.getPrompt(input.name, input.version);
      } else {
        result = await client.getPrompt(input.name, 'latest');
      }
    } else {
      throw new Error('Langfuse SDK does not support prompt retrieval');
    }

    const promptText = Array.isArray(result.prompt)
      ? result.prompt
          .map((entry: { type?: string; content?: string; name?: string }) =>
            entry.type === 'placeholder' ? `{${entry.name ?? 'placeholder'}}` : entry.content ?? ''
          )
          .join('\n')
      : result.prompt;

    return {
      prompt: promptText,
      version: result.version,
      labels: result.labels
    };
  } catch (error) {
    console.warn(`[RoutuneHub] Failed to fetch prompt "${input.name}" from Langfuse, using fallback.`, error);
    return null;
  }
}
