# Routune Hub

Routune Hub は、公開された Routine を再利用・カスタマイズし、
AI の提案を受けながら Google カレンダーへ反映する習慣設計アプリです。
AI は提案のみで、最終判断は必ずユーザーが行います。

## 仕様のポイント

- **Clone (Fork)**: 公開 Routine を自分のコピーとして取得し編集可能。元 Routine は不変。
- **Google カレンダーが唯一の正**: 書き込みは冪等で、アプリ側にカレンダー状態は持たない。
- **AI は提案のみ**: 衝突検出・最適化・将来コメントも確定はしない。

## 主な機能

- Routine の作成 / 公開 / 検索 / Clone
- AI プレビュー（ルーチン解釈・衝突検出・最適化案・将来コメント + LLM-as-Judge）
- カレンダー適用（期間指定 → プレビュー → 確認して反映）
- 「Routune」（文献 + 個人設定に基づくカスタマイズ）と手動編集の併用
- ユーザー設定（睡眠・希望時間・制約・優先順位）を AI に反映


## Tech Stack

- Next.js 16 (App Router) / React 19 / TypeScript / Tailwind / shadcn/ui
- AWS Bedrock / DynamoDB / ECS Fargate (Terraform)
- Mastra / Langfuse / NextAuth (Google OAuth)

## 開発

```bash
npm install
npm run dev
```

### よく使うスクリプト

- `npm run dev`
- `npm run build`
- `npm run test` / `npm run test:unit` / `npm run test:integration`
- `npm run storybook` / `npm run build-storybook`
- `npm run experiment:routine` / `npm run experiment:calendar-customization`

## Docs

- `docs/requiments.ja.md` : 要件・仕様（日本語）
- `docs/architecture.md` : アーキテクチャ概要
