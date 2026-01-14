export type LangfuseTraceInput = {
  workflow: string;
  payload: unknown;
  traceId?: string;
};

export type LangfuseTraceResult = {
  traceId: string;
  recordedAt: string;
};

type LangfuseClient = {
  trace: (payload: {
    id: string;
    name: string;
    timestamp: Date;
    input?: unknown;
    metadata?: Record<string, unknown>;
  }) => Promise<unknown>;
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
      await client.trace({
        id: traceId,
        name: input.workflow,
        timestamp: recordedAt,
        input: input.payload,
        metadata: {
          environment: process.env.NODE_ENV ?? 'development'
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
