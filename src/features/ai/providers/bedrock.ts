import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { z } from 'zod';

const DEFAULT_MODEL = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
const BEDROCK_VERSION = 'bedrock-2023-05-31';
const PROFILE_ONLY_MODEL_PATTERNS = [/claude-3-5/i];
let client: BedrockRuntimeClient | null = null;

const decoder = new TextDecoder();

function getRegion(): string {
  return process.env.AWS_REGION ?? process.env.BEDROCK_REGION ?? '';
}

function getClient(): BedrockRuntimeClient {
  if (!client) {
    const region = getRegion();
    if (!region) {
      throw new Error('AWS_REGION must be configured to call Bedrock.');
    }
    client = new BedrockRuntimeClient({ region });
  }
  return client;
}

export type BedrockStructuredParams<TSchema extends z.ZodTypeAny> = {
  systemPrompt: string;
  userPrompt: string;
  schema: TSchema;
  shapeExample: string;
  temperature?: number;
  maxTokens?: number;
};

export const isBedrockEnabled = (): boolean => {
  if (process.env.BEDROCK_DISABLE === 'true') return false;
  const region = getRegion();
  if (!region) return false;
  return Boolean(process.env.AWS_ACCESS_KEY_ID || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_SESSION_TOKEN);
};

export async function invokeBedrockStructured<TSchema extends z.ZodTypeAny>(
  params: BedrockStructuredParams<TSchema>
): Promise<z.infer<TSchema>> {
  const modelId = process.env.AWS_BEDROCK_MODEL ?? DEFAULT_MODEL;
  const inferenceProfileArn = process.env.AWS_BEDROCK_INFERENCE_PROFILE_ARN;
  const fallbackModelId =
    process.env.AWS_BEDROCK_FALLBACK_MODEL ?? 'anthropic.claude-3-haiku-20240307-v1:0';
  const requiresInferenceProfile = PROFILE_ONLY_MODEL_PATTERNS.some((pattern) => pattern.test(modelId));
  const body = JSON.stringify({
    anthropic_version: BEDROCK_VERSION,
    max_tokens: params.maxTokens ?? 600,
    temperature: params.temperature ?? 0.2,
    system: params.systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${params.userPrompt}\nRespond ONLY with valid JSON matching this shape: ${params.shapeExample}`
          }
        ]
      }
    ]
  });

  const attempts: Array<{ modelId: string; label: string }> = [];

  if (inferenceProfileArn) {
    attempts.push({ modelId: inferenceProfileArn, label: 'inference-profile' });
  } else if (requiresInferenceProfile) {
    console.warn(
      `[RoutineHub] Model ${modelId} requires AWS_BEDROCK_INFERENCE_PROFILE_ARN. Falling back to on-demand models.`
    );
  }

  if (!requiresInferenceProfile || Boolean(inferenceProfileArn)) {
    attempts.push({ modelId, label: 'primary-model' });
  }

  if (!attempts.some((attempt) => attempt.modelId === fallbackModelId)) {
    attempts.push({ modelId: fallbackModelId, label: 'fallback-model' });
  }

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const response = await getClient().send(
        new InvokeModelCommand({
          contentType: 'application/json',
          accept: 'application/json',
          body,
          modelId: attempt.modelId
        })
      );

      const payload = JSON.parse(decoder.decode(response.body));
      const segments = payload.output?.[0]?.content ?? payload.content ?? [];
      const text = Array.isArray(segments)
        ? segments.map((segment: any) => segment.text ?? segment.content ?? '').join('').trim()
        : payload.completion ?? payload.output_text ?? '';

      if (!text) {
        throw new Error('Bedrock response did not include completion text.');
      }

      const candidate = text.trim();
      const jsonStart = candidate.indexOf('{');
      const jsonString = jsonStart >= 0 ? candidate.slice(jsonStart) : candidate;
      const parsed = JSON.parse(jsonString);
      return params.schema.parse(parsed);
    } catch (attemptError) {
      lastError = attemptError;
      continue;
    }
  }

  throw lastError ?? new Error('Bedrock invocation failed');
}

export async function invokeBedrockWithFallback<TSchema extends z.ZodTypeAny>(
  params: BedrockStructuredParams<TSchema>,
  fallback: () => z.infer<TSchema>
): Promise<z.infer<TSchema>> {
  if (isBedrockEnabled()) {
    try {
      return await invokeBedrockStructured(params);
    } catch (error) {
      console.warn('[RoutineHub] Bedrock invocation failed, using fallback output.', error);
      if (error && typeof error === 'object') {
        console.warn('[RoutineHub] Bedrock error detail:', JSON.stringify(error, null, 2));
      }
      if (!process.env.AWS_BEDROCK_INFERENCE_PROFILE_ARN) {
        console.warn('Set AWS_BEDROCK_INFERENCE_PROFILE_ARN to use provisioned throughput for this model.');
      }
    }
  }
  return fallback();
}
