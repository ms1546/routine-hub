/**
 * Calendar Customization ワークフローの実験実行スクリプト（Langfuse Dataset 対象）
 *
 * 使い方:
 *   npm run experiment:calendar-customization
 *   （.env.local から LANGFUSE_* / AWS_BEDROCK_* 等を読み込む。未設定時は環境変数を要する）
 *
 * 前提:
 *   - .env.local に LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY を定義（または環境変数で渡す）
 *   - Langfuse に Dataset「calendar-customization-eval」が存在すること
 *   - Dataset item の input は「再実行用の run input」を含むこと。Trace から追加する場合は、
 *     本番/ローカルで Routune を 1 回実行したあと、Langfuse のその Trace を「Add to dataset」すると
 *     payload.runInput が入る（calendar-customization-core が Trace に runInput を載せている）。
 *     それ以前に追加した item（runInput なし）はスキップされる。
 *   - AWS_BEDROCK_* または BEDROCK 関連の環境変数（Bedrock 有効時）は .env.local に記載可
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { runCalendarCustomizationWithTrace } from '../src/app/actions/calendar-customization-core';
import type { CalendarCustomizationRunInput } from '../src/app/actions/calendar-customization-core';

/** プロジェクトルートの .env.local を読み、未設定の key だけ process.env にセットする */
function loadEnvLocal() {
  const root = process.cwd();
  const envPath = resolve(root, '.env.local');
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/\\"/g, '"');
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();

const DATASET_NAME = 'calendar-customization-eval';

/** calendar-customization-workflow の Trace に送っている payload の形（再実行用の run input ではない） */
const TRACE_INPUT_KEYS = [
  'executionId',
  'proposedEventCount',
  'existingEventCount',
  'promptVersions',
  'bedrockEnabled'
] as const;

function isTraceMetadataOnly(raw: unknown): boolean {
  const o = raw as Record<string, unknown>;
  if (!o || typeof o !== 'object') return false;
  const hasTraceMeta =
    TRACE_INPUT_KEYS.every((k) => k in o) &&
    typeof o.executionId === 'string' &&
    typeof o.proposedEventCount === 'number';
  const hasRunInput =
    Array.isArray(o.proposedEvents) ||
    (o.inputData != null &&
      typeof o.inputData === 'object' &&
      Array.isArray((o.inputData as Record<string, unknown>).proposedEvents)) ||
    (o.runInput != null && hasRunInputShape(o.runInput));
  return hasTraceMeta && !hasRunInput;
}

type LangfuseDatasetItem = {
  id: string;
  input: unknown;
  expectedOutput?: unknown;
  metadata?: Record<string, unknown>;
};

type PaginatedDatasetItems = {
  data: LangfuseDatasetItem[];
  meta: {
    page?: number;
    limit?: number;
    totalItems?: number;
    totalPages?: number;
  };
};

async function fetchLangfuseDatasetItems(): Promise<LangfuseDatasetItem[]> {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const baseUrl = (process.env.LANGFUSE_BASE_URL ?? 'https://cloud.langfuse.com').replace(/\/$/, '');

  if (!publicKey || !secretKey) {
    throw new Error(
      'LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY are required to fetch the dataset. Set them in the environment.'
    );
  }

  const auth = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
  const all: LangfuseDatasetItem[] = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const url = new URL(`${baseUrl}/api/public/dataset-items`);
    url.searchParams.set('datasetName', DATASET_NAME);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(limit));

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Langfuse dataset fetch failed: ${res.status} ${res.statusText}. ${text.slice(0, 300)}`
      );
    }

    const body = (await res.json()) as PaginatedDatasetItems;
    const items = body.data ?? [];
    all.push(...items);

    const meta = body.meta ?? {};
    const totalPages = meta.totalPages ?? 1;
    if (page >= totalPages || items.length === 0) break;
    page += 1;
  }

  return all;
}

function hasRunInputShape(o: unknown): o is CalendarCustomizationRunInput {
  const r = o as Record<string, unknown>;
  return (
    r != null &&
    typeof r === 'object' &&
    Array.isArray(r.proposedEvents) &&
    Array.isArray(r.existingEvents) &&
    r.userProfile != null &&
    typeof r.userProfile === 'object'
  );
}

function asRunInput(raw: unknown): CalendarCustomizationRunInput {
  if (raw == null || typeof raw !== 'object') {
    throw new Error('Dataset item input must be an object');
  }
  const o = raw as Record<string, unknown>;

  // トップレベルにそのままある
  if (hasRunInputShape(o)) {
    return o as CalendarCustomizationRunInput;
  }
  // Trace の payload に runInput を含めて記録している形式（Add to dataset で取得）
  if (o.runInput != null && hasRunInputShape(o.runInput)) {
    return o.runInput as CalendarCustomizationRunInput;
  }
  // Trace の observation から追加した場合など: inputData にラップされている
  if (o.inputData != null && hasRunInputShape(o.inputData)) {
    return o.inputData as CalendarCustomizationRunInput;
  }
  // payload にラップされている
  if (o.payload != null && hasRunInputShape(o.payload)) {
    return o.payload as CalendarCustomizationRunInput;
  }

  const keys = Object.keys(o).join(', ') || '(none)';
  throw new Error(
    `Dataset item input must have proposedEvents, existingEvents, and userProfile at top level or under inputData/payload. Received keys: ${keys}. ` +
      'Add items with the correct JSON shape (see docs/langfuse-demo-improvement-guide.md).'
  );
}

async function runExperiment() {
  console.log('[Experiment] Fetching dataset from Langfuse...');
  const allItems = await fetchLangfuseDatasetItems();

  if (allItems.length === 0) {
    console.error(
      `[Experiment] Dataset "${DATASET_NAME}" has no items. Add items in Langfuse (Datasets → ${DATASET_NAME} → Add item) and run again.`
    );
    process.exit(1);
  }

  // calendar-customization-workflow の Trace メタデータのみの item（再実行用 input なし）はスキップ
  const skipped: LangfuseDatasetItem[] = [];
  const items: LangfuseDatasetItem[] = [];
  for (const item of allItems) {
    const raw = item.input;
    if (isTraceMetadataOnly(raw)) {
      skipped.push(item);
      continue;
    }
    try {
      asRunInput(raw);
      items.push(item);
    } catch {
      skipped.push(item);
    }
  }

  if (skipped.length > 0) {
    console.log(
      `[Experiment] Skipped ${skipped.length} item(s) without run input (trace metadata only or invalid shape).`
    );
    for (const s of skipped) {
      console.log(`  - ${s.id}`);
    }
    console.log('');
  }

  if (items.length === 0) {
    console.error(
      `[Experiment] No items with run input (proposedEvents, existingEvents, userProfile). ` +
        `Dataset items must have that shape for re-execution. Trace metadata only (executionId, proposedEventCount, ...) is not enough.`
    );
    process.exit(1);
  }

  console.log(`[Experiment] Dataset: ${DATASET_NAME}, Items to run: ${items.length}\n`);
  console.log('[Experiment] Starting calendar customization workflow experiment...\n');

  const results: Array<{
    index: number;
    itemId: string;
    traceId: string;
    customizedCount: number;
    suggestionsCount: number;
    conflictAdjusted: number;
    ok: boolean;
  }> = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const traceId = randomUUID();
    try {
      const input = asRunInput(item.input);
      const result = await runCalendarCustomizationWithTrace(input, traceId);
      const conflictAdjusted = result.customizedEvents.filter(
        (c) => c.start != null || c.end != null
      ).length;

      results.push({
        index: i + 1,
        itemId: item.id,
        traceId,
        customizedCount: result.customizedEvents.length,
        suggestionsCount: result.suggestions.length,
        conflictAdjusted,
        ok: true
      });

      console.log(
        `  [${i + 1}/${items.length}] itemId=${item.id.slice(0, 8)}… traceId=${traceId} | ` +
          `customized=${result.customizedEvents.length} suggestions=${result.suggestions.length} ` +
          `adjusted=${conflictAdjusted} | OK`
      );
    } catch (error) {
      console.error(`  [${i + 1}/${items.length}] itemId=${item.id} ERROR:`, error);
      results.push({
        index: i + 1,
        itemId: item.id,
        traceId,
        customizedCount: 0,
        suggestionsCount: 0,
        conflictAdjusted: 0,
        ok: false
      });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  console.log('\n--- Summary ---');
  console.log(`OK: ${okCount}/${results.length}`);
  console.log('\nLangfuse Trace IDs (for manual evaluation):');
  results.forEach((r) => {
    if (r.ok) console.log(`  [${r.index}] ${r.traceId}`);
  });
}

runExperiment().catch((err) => {
  console.error('[Experiment] Fatal error:', err);
  process.exit(1);
});
