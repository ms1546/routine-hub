export type LangfuseTraceInput = {
  workflow: string;
  payload: unknown;
  traceId?: string;
};

export type LangfuseTraceResult = {
  traceId: string;
  recordedAt: string;
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
    name: string;
    timestamp: Date;
    input?: unknown;
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
  prompts?: {
    getPrompt: (name: string, options?: {
      version?: number | 'latest';
      label?: string;
    }) => Promise<LangfusePrompt>;
  };
  getPrompt?: (name: string, options?: {
    version?: number | 'latest';
    label?: string;
  }) => Promise<LangfusePrompt>;
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
          console.warn('[RoutineHub] Langfuse SDK not available, skipping trace export.');
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
        console.warn('[RoutineHub] Failed to initialize Langfuse client.', error);
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
    console.warn('[RoutineHub] Langfuse trace recording failed, continuing without telemetry.', error);
  }

  return {
    traceId,
    recordedAt: recordedAt.toISOString()
  };
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
    console.warn('[RoutineHub] Langfuse score recording failed, continuing without telemetry.', error);
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
    console.warn('[RoutineHub] Langfuse observation recording failed, continuing without telemetry.', error);
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

    // Langfuse SDKのAPI形式: getPrompt(name, version, options)
    // version と label は同時に指定できないため、label を優先
    let result: LangfusePrompt;
    if (client.getPrompt) {
      // client.getPrompt(name, version, options) 形式
      // label が指定されている場合は version を undefined にする
      if (input.label) {
        // label のみを使用（version は undefined）
        result = await client.getPrompt(input.name, undefined, { label: input.label });
      } else if (input.version !== undefined) {
        // version のみを使用（label は指定しない）
        const version = input.version === 'latest' ? 'latest' : input.version;
        result = await client.getPrompt(input.name, version);
      } else {
        // デフォルト: version も label も指定されていない場合は version='latest' で取得
        result = await client.getPrompt(input.name, 'latest');
      }
    } else {
      throw new Error('Langfuse SDK does not support getPrompt method');
    }

    return {
      prompt: result.prompt,
      version: result.version,
      labels: result.labels
    };
  } catch (error) {
    console.warn(`[RoutineHub] Failed to fetch prompt "${input.name}" from Langfuse, using fallback.`, error);
    return null;
  }
}
