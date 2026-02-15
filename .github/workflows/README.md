# GitHub Actions Workflows

このディレクトリには、Routine HubのCI/CDパイプラインを定義するGitHub Actionsワークフローが含まれています。

## Workflows

### 1. CI (`ci.yml`)

すべてのブランチとプルリクエストで実行されるCIチェック。

**実行内容**:
- **Lint**: ESLintによるコードスタイルチェック
- **TypeCheck**: TypeScriptの型チェック（`any`の使用を検出）
- **Unit Tests**: 単体テストの実行
- **Integration Tests**: 統合テストの実行
- **Storybook Build**: Storybookのビルド確認
- **Chromatic Visual Review**: ビジュアル回帰テスト（人間の承認が必要）

**Chromatic承認要件**:
- PRには**すべてのStoryが承認されない限りCIは通らない**
- これにより、UI品質を自動化だけに委ねず、人間の判断を必須にする

### 2. PR Preview Environment (`pr-preview.yml`)

プルリクエストごとにエフェメラルなプレビュー環境をデプロイします。

**トリガー**:
- PRが`opened`、`synchronize`、`reopened`されたとき → デプロイ
- PRが`closed`されたとき → 環境を削除

**デプロイ内容**:
- ECS Fargateサービスを起動
- 共有ALBを使用（パスベースルーティング: `/pr-{number}`）
- Terraformを使用してインフラを管理

**セーフティ機能**:
- `MASTRA_USE_MOCK=true`: AIワークフローは強制的にモック実行
- `DISABLE_CALENDAR_WRITES=true`: Google Calendar書き込みは無効化

**自動クリーンアップ**:
- PRがクローズされると、環境は自動的に削除される

### 3. Production Deployment (`deploy-production.yml`)

本番環境へのデプロイ。

**トリガー**:
- `main`ブランチへのpush時のみ実行

**デプロイ内容**:
- ECS Fargateサービスへのデプロイ
- Terraformを使用したインフラ管理
- Rolling update（段階的更新）

## Required Secrets

以下のGitHub Secretsを設定する必要があります：

| Secret Name | Description |
|------------|-------------|
| `CHROMATIC_PROJECT_TOKEN` | Chromaticプロジェクトトークン |
| `AWS_ACCESS_KEY_ID` | AWSアクセスキーID |
| `AWS_SECRET_ACCESS_KEY` | AWSシークレットアクセスキー |
| `AWS_REGION` | AWSリージョン（デフォルト: `ap-northeast-1`） |
| `AWS_VPC_ID` | VPC ID |
| `AWS_SUBNET_IDS` | サブネットID（カンマ区切り、例: `subnet-xxx,subnet-yyy`） |
| `TERRAFORM_STATE_BUCKET` | **必須** Terraform状態ファイルを保存するS3バケット名 |
| `ECR_REPOSITORY_URL` | ECRリポジトリURL（オプション） |
| `ECS_DESIRED_COUNT` | 本番環境のECSタスク数（デフォルト: `2`） |

## Environment Variables

### Preview Environments

プレビュー環境では、以下の環境変数が自動的に設定されます：

- `MASTRA_USE_MOCK=true`: AIワークフローをモックモードで実行
- `DISABLE_CALENDAR_WRITES=true`: カレンダー書き込みを無効化
- `NODE_ENV=preview`: 環境識別子

### Production Environment

本番環境では、環境変数はSecrets ManagerまたはTerraform変数で管理されます。

## Workflow Execution

### CI Workflow

```bash
# CIはすべてのプッシュとPRで自動実行される
# 手動実行は不要
```

### PR Preview Workflow

```bash
# PRを作成すると自動的にプレビュー環境がデプロイされる
# PRをクローズすると自動的に削除される
```

### Production Deployment

```bash
# mainブランチにマージすると自動的にデプロイされる
# 手動実行は不要（セキュリティのため）
```

## Notes

1. **Chromatic承認**: Chromaticの承認が完了しない限り、CIは失敗します。
2. **Preview Environment**: プレビュー環境はコストを抑制するため、PRクローズ時に自動削除されます。
3. **Production Safety**: 本番環境へのデプロイは`main`ブランチへのマージ時のみ実行されます。
4. **Terraform State Backend**: Terraformの状態は**S3バックエンド**で管理されます（冪等性と`destroy`を保証）。
   - **Production**: `s3://{TERRAFORM_STATE_BUCKET}/production/terraform.tfstate`
   - **Preview PR-123**: `s3://{TERRAFORM_STATE_BUCKET}/preview/pr-123/terraform.tfstate`
   - 各環境で独立した状態ファイルを使用することで、`destroy`や`plan`が正しく動作します。
5. **S3 Bucket**: `TERRAFORM_STATE_BUCKET`シークレットで指定されたS3バケットは、Terraform状態ファイルの保存に使用されます。バージョニングと暗号化を推奨します。

## Troubleshooting

### CIが失敗する場合

1. **Lintエラー**: `npm run lint`をローカルで実行して確認
2. **TypeScriptエラー**: `npm run typecheck`をローカルで実行して確認
3. **テスト失敗**: `npm run test`をローカルで実行して確認
4. **Chromatic承認待ち**: ChromaticダッシュボードでStoryを承認

### PR Previewがデプロイされない場合

1. **Secrets確認**: 必要なSecretsが設定されているか確認
2. **Terraform状態**: Terraformの状態が正しく初期化されているか確認
3. **AWS権限**: AWSアクセスキーに適切な権限があるか確認

### Production Deploymentが失敗する場合

1. **Terraform Plan**: Terraform planの結果を確認
2. **AWSリソース**: 必要なAWSリソース（VPC、サブネット等）が存在するか確認
3. **ECS容量**: ECSクラスタに十分な容量があるか確認
