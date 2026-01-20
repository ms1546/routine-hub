# Routine Hub

## 概要

Routine Hub は、他人が設計した「習慣（Routine）」を再利用・カスタマイズし、
AI の補助を受けながら Google カレンダーに反映できる習慣設計支援アプリケーションです。

本プロジェクトは「AIを使うこと」そのものではなく、
**AIをどのように運用・評価・改善するか**に重点を置いて設計されています。

---

## プロダクト哲学

### Clone vs Follow：所有権の明確化

Routine Hubでは、**Clone（クローン）**と**Follow（フォロー）**を明確に区別しています。

**Clone（クローン）**:
- Routineを**個人所有のコピーとして取得**する操作
- CloneしたRoutineは自分の「My Routines」に追加される
- Cloneした後は、編集・AI最適化が可能
- 元のRoutineとは独立した個人所有のRoutine
- GitHubの「fork」とは異なり、上流（upstream）との関係はない

**Follow（フォロー）**（将来実装予定）:
- Routineを**参照のみ**で閲覧・フォローする操作
- 所有権を取得しないため、編集・カスタマイズは不可
- 公開Routineを参考として閲覧する用途

**設計意図**:
- Clone = **所有権を取得して個人カスタマイズを可能にする**
- Follow = **参照のみで、所有権を取らない**
- これにより、公開Routineは**不変の参照テンプレート**として機能する

### AI as Proposal-Only System（提案のみのAI）

Routine HubのAIは、**決して自動判断を行いません**。すべてのAI出力は「提案」として扱われ、人間の明示的な確認が必要です。

**原則**:
- AIは予定を自動確定しない
- 衝突検出は必ずユーザー確認を挟む
- AIの最適化提案は、ユーザーが明示的に承認するまで適用されない
- すべてのAIステップは「提案」として提示され、最終判断は人間が行う

**設計意図**:
> AIは賢いですが、責任は取れません。
> Routine Hub では人間が最終判断を行います。

これにより、AIの誤判断による予定の破綻を防ぎ、ユーザーの主権を守ります。

### Portfolio Modeの制約

本プロジェクトは**ポートフォリオ用のデモアプリケーション**として設計されています。

**Google Calendar書き込み**:
- **adminユーザーのみ**がカレンダーへの書き込みを実行可能
- 通常ユーザーは閲覧・Clone・AIシミュレーション（モック）のみ
- この制約により、レビュアーが機密性の高いカレンダー権限を付与する必要がない

**認証・トークン管理**:
- Refresh tokenは**保存されない**（ポートフォリオのセキュリティ考慮）
- 各カレンダー書き込み時にOAuth同意が必要
- Access tokenは短期間のみ有効で、使用後は破棄

これらは**意図的な設計決定**であり、実運用アプリケーションとは異なります。

---

## CI/CD & PR Preview Design

### CI（すべてのブランチ・PR）

すべてのブランチとプルリクエストで以下のチェックを実行：

1. **Lint**: コードスタイルとベストプラクティスの確認
2. **Typecheck**: TypeScriptの型チェック（`any`の使用は禁止）
3. **Unit Tests**: 単体テストの実行
4. **Integration Tests**: 統合テストの実行
5. **Storybook Build**: Storybookのビルド確認
6. **Chromatic Visual Review**: ビジュアル回帰テスト（人間の承認が必要）

**Chromaticの承認要件**:
- PRには**すべてのStoryが承認されない限りCIは通らない**
- これにより、UI品質を自動化だけに委ねず、人間の判断を必須にする

### PR Preview Environment

各プルリクエストに対して、**エフェメラルなプレビュー環境**を自動的にデプロイします：

**デプロイ**:
- ECS Fargateサービスを自動起動
- 共有ALBを再利用
- パスまたはサブドメインでルーティング（例: `/pr-123`）

**セーフティ機能**:
- 実際のGoogle Calendar書き込みは無効化
- AIワークフローは強制的にモック実行
- これにより、プレビュー環境での外部システムへの影響を防止

**自動クリーンアップ**:
- PRがクローズされると、プレビュー環境は自動的に削除される

### Production Deployment

**トリガー**:
- `main`ブランチへのマージ時のみ実行

**デプロイ方法**:
- ECS Fargateを使用
- Terraformでインフラを管理
- Rolling update（段階的更新）を実行

**インフラ管理**:
- 単一のコードベースで、変数によりpreview/productionを切り替え
- オーバーエンジニアリングを避ける（EKS、Step Functionsは不使用）

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
* 人間評価（Human Evaluation）を正式に組み込み

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

* Next.js v16 (App Router only)
* TypeScript (strict mode)
* AWS ECS (Fargate)
* AWS Bedrock
* Mastra
* Langfuse
* DynamoDB
* Storybook / Chromatic
* GitHub Actions
* Terraform (IaC)

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

* `docs/architecture.md` : 設計思想・構成判断
* `docs/testing-strategy.md` : テスト戦略
* `docs/oauth-design.md` : OAuth設計（Portfolio Modeの制約）
* `docs/langfuse-evaluation-integration.md` : Langfuse統合とLLMOps設計

---

## まとめ

Routine Hub は、

* AIを魔法の箱として扱わない
* 人間の意思決定を尊重する
* 運用と改善を前提に設計する
* Clone vs Follow で所有権を明確化する
* CI/CDとPRプレビュー環境で安全性を確保する

という思想のもとに作られたポートフォリオプロジェクトです。

「AIを使ったアプリ」ではなく、
**「AIを運用できるエンジニアリング」を示すこと**を目的としています。

---

## For Hiring Managers

このプロジェクトは、以下の観点から評価していただけます：

1. **LLMOps実践**: Langfuseによるプロンプト管理と評価データの蓄積
2. **安全性設計**: Portfolio Modeでの制約設計とCI/CDによる品質保証
3. **明確なアーキテクチャ**: Clone vs Followのような概念の明確化
4. **運用現実主義**: オーバーエンジニアリングを避け、実用的な設計選択

詳細は `docs/` ディレクトリ内の各ドキュメントを参照してください。
