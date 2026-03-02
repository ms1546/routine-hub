# LLMOps 実装状況

Routine Hub における Langfuse を中心とした LLMOps の実装状況をまとめます。

---

## 1. Tracing（トレース記録）

| 対象 | Trace Name | ファイル | 状態 |
|------|------------|----------|------|
| ルーチン計画（Mastra） | `routine-planning-workflow` | `routine-mastra-runner.ts` | ✅ |
| ルーチン計画（Mock） | `routine-planning-workflow` | `routine-mock-runner.ts` | ✅ |
| ルーチン計画（ストリーム API） | `routine-planning-workflow-stream` | `api/ai/stream/route.ts` | ✅ |
| Evidence Advice | `evidence-advice-workflow` | `evidence-advice.ts` | ✅ |
| カレンダーカスタマイズ | `calendar-customization-workflow` | `calendar-customization.ts` | ✅ |
| カレンダー適用（insert/merge/skip） | 未実装 | `calendar.ts` (confirmProposedEventsAction) | — |

**記録内容:** `workflow`, `payload`, `promptVersions`, `environment`, `bedrockEnabled`

### 1.1 Trace の観測ポイント（参考）

| ワークフロー | Input の目安 | 期待される Output の目安 |
|--------------|--------------|---------------------------|
| **evidence-advice-workflow** | `bedrockEnabled: true` のとき | `searchQuery` が英語、`suggestions[].evidence` に文献あり、`warnings` 空。`false` のときは `searchQuery` が日本語のまま・文献なしフォールバック。 |
| **calendar-customization-workflow** | `bedrockEnabled: true`、前段で evidence 取得済み | `customizedEvents[].reasoning` が根拠・設定に言及、`suggestions` に提案ありうる。前段の evidence が弱いと「カスタマイズの必要はありませんでした」が並びやすい。 |

---

## 2. Score（評価スコア）

| 対象 | スコア名 | source | 記録タイミング |
|------|----------|--------|----------------|
| ルーチン計画（Mastra / ストリーム） | `judge-overall` | MODEL | 評価ステップ完了後 |
| Evidence Advice | `suggestions-count` | MODEL | 成功時・失敗時 |
| カレンダーカスタマイズ | `customized-events-count` | MODEL | 成功時・失敗時 |

**根拠に基づくカスタマイズの切り分け用 metadata（精度改善時に利用）:**

- `suggestions-count` (Evidence Advice): `hasLiteratureEvidence`, `isGenericFallback`
- `customized-events-count` (カスタマイズ): `hasEvidenceContext`, `evidenceIsGeneric`  
→ 詳細は `docs/langfuse-evaluation-integration.md` の「根拠に基づくカスタマイズの評価・改善」

---

## 3. プロンプト管理

| 項目 | 状態 | 備考 |
|------|------|------|
| Langfuse からの取得 | ✅ | `getLangfusePrompt` |
| フォールバック | ✅ | コード内 `AGENT_PROMPTS` |
| バージョン・ラベル指定 | ✅ | `version`, `label` |
| Trace へのプロンプトバージョン記録 | ✅ | `metadata.promptVersions` |

**管理対象プロンプト（9種類）:**

- `profile-agent`
- `routine-interpreter-agent`
- `calendar-conflict-agent`
- `optimization-agent`
- `future-simulation-agent`
- `calendar-customization-agent`
- `calendar-apply-resolution-agent` … カレンダー適用時の insert/merge/skip 判定
- `evidence-advice-agent`
- `judge-agent`

---

## 4. LLM as Judge

| 項目 | 状態 |
|------|------|
| Bedrock 有効時 | ✅ Claude による LLM 評価 |
| Bedrock 無効時 | ✅ ルールベースにフォールバック |
| 評価観点 | clarity, consistency, explanationQuality（各 1–5） |
| Langfuse へのスコア記録 | ✅ `judge-overall` |

---

## 5. 人間評価

- アプリ内の評価フォームは廃止
- **Langfuse UI** の Annotate / Add Score で実施

---

## 6. Datasets / Experiments

| 項目 | 状態 | 備考 |
|------|------|------|
| ドキュメント | ✅ | `docs/langfuse-datasets-experiments.md` |
| 実験スクリプト | ✅ | `scripts/run-routine-experiment.ts` |
| npm スクリプト | ✅ | `npm run experiment:routine` |
| Langfuse Datasets UI 連携 | ドキュメントのみ | UI での手動手順を記載 |
| Langfuse Experiments SDK 実行 | ローカルデータ対応 | スクリプトでローカルデータを回す想定 |

---

## 7. Langfuse Evaluators（UI 設定）

| 項目 | 状態 |
|------|------|
| 設定ガイド | ✅ `docs/langfuse-evaluation-integration.md` に記載 |
| 推奨 Trace 名 | `routine-planning-workflow`, `routine-planning-workflow-stream` |
| カスタム Evaluator 例 | ドキュメント内にプロンプト例あり |

---

## 8. 未実装・制限事項

| 項目 | 状態 |
|------|------|
| `recordLangfuseObservation` | 定義のみ。呼び出しなし |
| Cost / Token 追跡 | Langfuse 標準に依存（SDK 側の明示的な計測は未実装） |
| Experiments SDK と Langfuse Dataset 連携 | 未実装（ローカルデータのみ） |
| カレンダー適用ワークフローの Trace | 未実装（エージェントは Server Action 内で呼び出しのみ） |

---

## 8.1 新エージェントの Langfuse 設定（LLMOps 方針時）

**方針:** プロンプトは Langfuse で管理する場合の設定です。

| 設定 | 説明 |
|------|------|
| **プロンプト** | Langfuse の **Prompts** に `calendar-apply-resolution-agent` を登録する。名前はコードの `getSystemPrompt('calendar-apply-resolution-agent')` と一致させる。**手順とコピー用本文**は `docs/langfuse-evaluation-integration.md` の「例: calendar-apply-resolution-agent を Langfuse で管理する」を参照。 |
| **Trace** | 適用フロー（confirmProposedEventsAction）では現状 Trace を送っていない。必要なら `calendar-apply-workflow` 等の Trace を追加可能。 |

---

## 9. 環境変数

| 変数 | 用途 |
|------|------|
| `LANGFUSE_PUBLIC_KEY` | Langfuse 認証 |
| `LANGFUSE_SECRET_KEY` | Langfuse 認証 |
| `LANGFUSE_BASE_URL` | Langfuse ホスト（本番: `https://us.cloud.langfuse.com`） |
| `LANGFUSE_DISABLE` | `true` で Langfuse 無効化 |
| `VERCEL_GIT_COMMIT_SHA` | トレースの `release` に使用 |
| `BEDROCK_ENABLED` | `true` で ECS タスクロール等のデフォルト認証で Bedrock 有効（本番で未設定だと `isBedrockEnabled()` が false になり得る） |
| `AWS_BEDROCK_GUARDRAIL_ID` / `AWS_BEDROCK_GUARDRAIL_ARN` | Bedrock ガードレール（省略時は未適用） |
| `AWS_BEDROCK_GUARDRAIL_VERSION` | ガードレールバージョン（例: `1`） |

---

## 10. 関連ドキュメント

| ファイル | 内容 |
|----------|------|
| `docs/langfuse-evaluation-integration.md` | Langfuse 統合・人間評価・Evaluators 設定 |
| `docs/langfuse-datasets-experiments.md` | Datasets・Experiments・実験スクリプトの使い方 |
| `docs/bedrock-guardrails-setup.md` | Bedrock ガードレール作成手順・環境変数 |

---

## 11. アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────────┐
│ AI ワークフロー実行                                               │
├─────────────────────────────────────────────────────────────────┤
│ routine-mastra-runner  │ routine-mock-runner  │ api/ai/stream    │
│ ✅ Trace + Score       │ ✅ Trace             │ ✅ Trace + Score  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ langfuse-boundary.ts                                             │
│ recordLangfuseTrace / recordLangfuseScore / getLangfusePrompt    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Langfuse Cloud                                                   │
│ Traces / Scores / Prompts / Human Annotation                     │
└─────────────────────────────────────────────────────────────────┘
```

---

*最終更新: 上記実装に基づく*
