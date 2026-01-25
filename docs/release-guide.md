# リリース手順書

## 概要

以下の3つの機能をリリースします：
1. **EventBridgeによる自動起動・停止機能** - 夜間のコスト最適化
2. **AI実行イベントの永続化** - DynamoDBへの保存
3. **繰り返し設定UIの復活** - カレンダー予定の繰り返し設定

---

## リリース前の準備チェックリスト

### 1. コードレビュー
- [ ] すべての変更がレビュー済み
- [ ] CI/CDパイプラインが成功している
- [ ] Storybook + Chromaticのビジュアルレビューが承認済み

### 2. Lambda関数の準備
- [ ] `terraform/lambda/scheduler.py`が正しく実装されている
- [ ] Lambda関数をZIP化する準備ができている

### 3. 環境変数の確認
- [ ] `DYNAMODB_AI_EXECUTION_LOGS_TABLE`が設定される予定
- [ ] 既存の環境変数に影響がないことを確認

### 4. Terraform変数の確認
- [ ] `enable_scheduled_shutdown`のデフォルト値（`false`）を確認
- [ ] 本番環境で有効化する場合は`true`に設定する計画を確認

---

## リリース手順

### ステップ1: Lambda関数のZIP化

**重要**: TerraformがLambda関数のZIPファイルを参照するため、事前に作成する必要があります。

```bash
# Lambda関数のディレクトリに移動
cd terraform/lambda

# ZIPファイルを作成
zip scheduler.zip scheduler.py

# 確認
ls -lh scheduler.zip
```

**注意**:
- ZIPファイルは`terraform/lambda/`ディレクトリに配置してください
- ファイル名は`scheduler.zip`である必要があります
- Terraformの`source_code_hash`が正しく計算されるように、ZIPファイルは変更のたびに再作成してください

### ステップ2: GitHub Secretsの確認

以下のSecretsが設定されていることを確認：

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_VPC_ID`
- `AWS_SUBNET_IDS`
- `TERRAFORM_STATE_BUCKET`
- `ECR_REPOSITORY_URL`
- `ECS_DESIRED_COUNT` (オプション)

### ステップ3: 本番環境変数の追加

ECSタスク定義に以下の環境変数を追加する必要があります：

```bash
DYNAMODB_AI_EXECUTION_LOGS_TABLE=routine-hub-production-ai-execution-logs
```

**設定方法**:
- GitHub Actionsの`deploy-production.yml`で`env_vars`に追加
- または、AWS Secrets Managerに保存してECSタスク定義で参照

### ステップ4: Terraform Planの確認

**本番環境へのデプロイ前に、必ずPlanを実行して変更内容を確認してください：**

```bash
cd terraform

# Terraform初期化
terraform init \
  -backend-config="bucket=routine-hub-terraform-state" \
  -backend-config="key=production/terraform.tfstate" \
  -backend-config="region=ap-northeast-1" \
  -backend-config="encrypt=true"

# Plan実行（EventBridgeは無効のまま）
terraform plan \
  -var="environment=production" \
  -var="vpc_id=$AWS_VPC_ID" \
  -var="subnet_ids=[$AWS_SUBNET_IDS]" \
  -var="ecr_repository_url=$ECR_REPOSITORY_URL" \
  -var="docker_image_tag=latest" \
  -var="ecs_desired_count=2" \
  -var="enable_scheduled_shutdown=false" \
  -out=tfplan
```

**確認ポイント**:
- [ ] DynamoDBテーブル`ai-execution-logs`が作成される
- [ ] Lambda関数、EventBridgeルールは作成されない（`enable_scheduled_shutdown=false`のため）
- [ ] 既存リソースへの影響がない

### ステップ5: 段階的デプロイ（推奨）

#### Phase 1: DynamoDBテーブルとアプリケーションコードのデプロイ

```bash
# Terraform Apply（EventBridgeは無効）
terraform apply tfplan
```

**確認**:
- [ ] DynamoDBテーブルが作成された
- [ ] ECSタスクが正常に起動している
- [ ] アプリケーションが正常に動作している
- [ ] AI実行イベントがDynamoDBに保存されている

#### Phase 2: EventBridge機能の有効化（オプション）

EventBridge機能を有効にする場合は、別途PlanとApplyを実行：

```bash
# EventBridge有効化のPlan
terraform plan \
  -var="environment=production" \
  -var="vpc_id=$AWS_VPC_ID" \
  -var="subnet_ids=[$AWS_SUBNET_IDS]" \
  -var="ecr_repository_url=$ECR_REPOSITORY_URL" \
  -var="docker_image_tag=latest" \
  -var="ecs_desired_count=2" \
  -var="enable_scheduled_shutdown=true" \
  -var="stop_schedule_expression=cron(0 22 * * ? *)" \
  -var="start_schedule_expression=cron(0 6 * * ? *)" \
  -out=tfplan-eventbridge

# Apply
terraform apply tfplan-eventbridge
```

**確認**:
- [ ] Lambda関数が作成された
- [ ] EventBridgeルールが作成された
- [ ] Lambda関数の権限が正しく設定されている

---

## GitHub Actions経由でのデプロイ

### 自動デプロイ（mainブランチへのpush）

1. **Lambda関数のZIPをコミット**:
   ```bash
   git add terraform/lambda/scheduler.zip
   git commit -m "chore: Add Lambda function for EventBridge scheduler"
   git push origin main
   ```

2. **GitHub Actionsの確認**:
   - [ ] `.github/workflows/deploy-production.yml`が実行される
   - [ ] すべてのステップが成功する
   - [ ] Terraform Applyが正常に完了する

### 環境変数の追加

GitHub Actionsで環境変数を追加する場合、`.github/workflows/deploy-production.yml`を更新：

```yaml
- name: Terraform Plan (Production)
  working-directory: ./terraform
  run: |
    terraform plan \
      -var="environment=production" \
      -var="vpc_id=${{ secrets.AWS_VPC_ID }}" \
      -var="subnet_ids=[${{ secrets.AWS_SUBNET_IDS }}]" \
      -var="ecr_repository_url=${{ secrets.ECR_REPOSITORY_URL }}" \
      -var="docker_image_tag=latest" \
      -var="ecs_desired_count=${{ secrets.ECS_DESIRED_COUNT || '2' }}" \
      -var="enable_scheduled_shutdown=${{ secrets.ENABLE_SCHEDULED_SHUTDOWN || 'false' }}" \
      -var="stop_schedule_expression=${{ secrets.STOP_SCHEDULE_EXPRESSION || 'cron(0 22 * * ? *)' }}" \
      -var="start_schedule_expression=${{ secrets.START_SCHEDULE_EXPRESSION || 'cron(0 6 * * ? *)' }}" \
      -out=tfplan
```

**GitHub Secretsに追加**:
- `ENABLE_SCHEDULED_SHUTDOWN` (オプション、デフォルト: `false`)
- `STOP_SCHEDULE_EXPRESSION` (オプション、デフォルト: `cron(0 22 * * ? *)`)
- `START_SCHEDULE_EXPRESSION` (オプション、デフォルト: `cron(0 6 * * ? *)`)

---

## デプロイ後の確認

### 1. DynamoDBテーブルの確認

```bash
# AWS CLIでテーブルを確認
aws dynamodb describe-table \
  --table-name routine-hub-production-ai-execution-logs \
  --region ap-northeast-1
```

**確認ポイント**:
- [ ] テーブルが作成されている
- [ ] GSI `user-executed-at-index`が作成されている
- [ ] ポイントインタイムリカバリーが有効（設定されている場合）

### 2. アプリケーションの動作確認

- [ ] Routine詳細ページが正常に表示される
- [ ] AI最適化機能が動作する
- [ ] 繰り返し設定UIが表示される
- [ ] カレンダー適用が正常に動作する

### 3. AI実行イベントの永続化確認

```bash
# DynamoDBにデータが保存されているか確認
aws dynamodb scan \
  --table-name routine-hub-production-ai-execution-logs \
  --region ap-northeast-1 \
  --limit 5
```

**確認ポイント**:
- [ ] AI実行後にDynamoDBにレコードが保存される
- [ ] 実行回数制限が正しく機能する（再起動後も保持される）

### 4. EventBridge機能の確認（有効化した場合）

```bash
# Lambda関数の確認
aws lambda get-function \
  --function-name routine-hub-production-scheduler \
  --region ap-northeast-1

# EventBridgeルールの確認
aws events describe-rule \
  --name routine-hub-production-stop-service \
  --region ap-northeast-1

aws events describe-rule \
  --name routine-hub-production-start-service \
  --region ap-northeast-1
```

**確認ポイント**:
- [ ] Lambda関数が作成されている
- [ ] EventBridgeルールが有効（ENABLED）になっている
- [ ] Lambda関数に正しい権限が付与されている

---

## ロールバック手順

### 問題が発生した場合

1. **コードのロールバック**:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Terraformのロールバック**:
   ```bash
   cd terraform
   terraform plan -destroy  # 確認
   terraform destroy  # 注意: すべてのリソースが削除されます
   ```

3. **DynamoDBテーブルの削除（必要な場合）**:
   ```bash
   aws dynamodb delete-table \
     --table-name routine-hub-production-ai-execution-logs \
     --region ap-northeast-1
   ```

---

## 注意事項

### 1. Lambda関数のZIPファイル

- **重要**: Lambda関数のZIPファイルはGitにコミットする必要があります
- Terraformが`source_code_hash`で変更を検知するため、コード変更時は必ずZIPを再作成してください

### 2. EventBridge機能の有効化

- **デフォルトは無効**: `enable_scheduled_shutdown`のデフォルト値は`false`です
- 本番環境で有効化する場合は、慎重にスケジュールを設定してください
- テスト環境で十分に検証してから本番環境に適用してください

### 3. DynamoDBのコスト

- **PAY_PER_REQUEST**: DynamoDBテーブルはオンデマンド課金モードです
- TTL（90日）が設定されているため、古いデータは自動削除されます
- コストを監視してください

### 4. 実行回数制限の移行

- 既存のメモリ内の実行回数は、DynamoDB移行時にリセットされます
- これは意図的な動作です（新しい永続化システムへの移行）

---

## トラブルシューティング

### DynamoDBテーブルが作成されない

- Terraform Planでテーブルが表示されているか確認
- IAM権限が正しく設定されているか確認
- CloudWatch Logsでエラーログを確認

### Lambda関数のデプロイエラー

- ZIPファイルが正しく作成されているか確認
- ZIPファイルのパスが正しいか確認（`terraform/lambda/scheduler.zip`）
- Lambda関数のIAMロールが正しく設定されているか確認

### EventBridgeが動作しない

- EventBridgeルールが`ENABLED`になっているか確認
- Lambda関数の権限が正しく設定されているか確認
- CloudWatch LogsでLambda関数の実行ログを確認

---

## 関連ドキュメント

- [Terraform README](./terraform/README.md)
- [要件定義書](./docs/requiments.ja.md)
- [アーキテクチャドキュメント](./docs/architecture.md)
