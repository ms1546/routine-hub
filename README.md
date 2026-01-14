# Routine Hub

## 概要

Routine Hub は、他人が設計した「習慣（Routine）」を再利用・カスタマイズし、
AI の補助を受けながら Google カレンダーに反映できる習慣設計支援アプリケーションです。

本プロジェクトは「AIを使うこと」そのものではなく、
**AIをどのように運用・評価・改善するか**に重点を置いて設計されています。

---

## このプロジェクトでアピールしたいこと

### 1. AIを信頼しすぎない設計

* AIは予定を自動確定しません
* 衝突は必ずユーザー確認を挟みます
* AIの出力は常に「提案」として扱われます

> AIは賢いですが、責任は取れません。
> Routine Hub では人間が最終判断を行います。

---

### 2. LLMOps を前提とした設計

* Mastra による LLM-as-Judge 評価
* Langfuse によるプロンプト・評価の一元管理
* 人間評価（Manual Score）を正式に組み込み

AIの品質を「なんとなく良い」ではなく、
**評価 → 改善 → 理由を説明できる**形で扱っています。

---

### 3. Google カレンダーをマスターにした現実的設計

* Routine Hub はスケジュールの主ではありません
* Google カレンダーを唯一の正とします
* 冪等な書き込みを前提にしています

実運用で破綻しにくい設計を重視しています。

---

### 4. テストと人間レビューの両立

* ロジックは自動テストで保証
* UIは Storybook + Chromatic による人間レビュー必須
* 全 Story が Approve されない限り CI は通りません

UI品質を自動化だけに委ねない方針です。

---

### 5. コストを意識したインフラ設計

* AWS ECS (Fargate) を利用
* 夜間はサービスを自動停止
* 常時稼働を前提としない構成

---

## 技術スタック

* Next.js (App Router)
* TypeScript
* AWS ECS (Fargate)
* AWS Bedrock
* Mastra
* Langfuse
* DynamoDB
* Storybook / Chromatic
* GitHub Actions

### 主要な環境変数

| キー | 用途 | 備考 |
| --- | --- | --- |
| `AWS_REGION` | Bedrock のリージョン | 例: `ap-northeast-1` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Bedrock 呼び出し資格情報 | IAM ロール運用なら不要 |
| `AWS_BEDROCK_MODEL` | （任意）利用するモデル ID | 省略時は `anthropic.claude-3-5-sonnet-20241022-v2:0` |
| `AWS_BEDROCK_INFERENCE_PROFILE_ARN` | 推論プロファイル ARN | Bedrock のプロファイルを使う場合は必須 |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` | Langfuse 追跡 | `LANGFUSE_BASE_URL` でホスト変更可 |
| `MASTRA_USE_MOCK` | `true` で常にモック実行 | Bedrock 確認前の安全弁 |

---

## このリポジトリの見どころ

* docs/requirements.en.md : 英語による正式要件定義
* docs/architecture.md : 設計思想・構成判断
* docs/testing-strategy.md : テスト戦略
* .codex/instructions.md : Codex向け実装ルール

---

## まとめ

Routine Hub は、

* AIを魔法の箱として扱わない
* 人間の意思決定を尊重する
* 運用と改善を前提に設計する

という思想のもとに作られたポートフォリオプロジェクトです。

「AIを使ったアプリ」ではなく、
**「AIを運用できるエンジニアリング」を示すこと**を目的としています。
