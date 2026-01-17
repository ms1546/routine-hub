# DynamoDB Schema Design

## テーブル設計

### 1. UserSettings テーブル

**テーブル名**: `routine-hub-user-settings`

**Primary Key**:
- Partition Key (PK): `userId` (String)

**Attributes**:
- `userId` (String) - ユーザーID（メールアドレス）
- `displayName` (String) - 表示名（必須）
- `timezone` (String) - タイムゾーン（デフォルト: `Asia/Tokyo`）
- `requiredSleepHours` (Number) - 必要睡眠時間（デフォルト: 7）
- `priorities` (List of String) - 優先順位リスト
- `constraints` (List of String) - 制約リスト
- `energyLevel` (String) - エネルギーレベル（`low`, `medium`, `high`）
- `createdAt` (String) - ISO 8601形式の作成日時
- `updatedAt` (String) - ISO 8601形式の更新日時

**Indexes**: なし

**例**:
```json
{
  "userId": "routinehub.dev@gmail.com",
  "displayName": "admin",
  "timezone": "Asia/Tokyo",
  "requiredSleepHours": 7,
  "priorities": ["集中時間を守る", "カレンダーの権威を尊重"],
  "constraints": ["手動確認を好む"],
  "energyLevel": "medium",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 2. Routines テーブル

**テーブル名**: `routine-hub-routines`

**Primary Key**:
- Partition Key (PK): `routineId` (String) - UUID

**Attributes**:
- `routineId` (String) - Routine ID（UUID）
- `name` (String) - 名前
- `description` (String) - 説明
- `purpose` (String) - 目的
- `owner` (String) - 所有者のメールアドレス
- `visibility` (String) - 公開設定（`public`, `private`）
- `durationType` (String) - 期間タイプ（`half-day`, `full-day`, `weekly`）
- `intensity` (String) - 強度（`light`, `steady`, `immersive`）
- `tags` (List of String) - タグリスト
- `timeBlocks` (List of Map) - 時間ブロックリスト
  - `id` (String) - ブロックID
  - `label` (String) - ラベル
  - `objective` (String) - 目的
  - `day` (String) - 曜日（`monday`, `tuesday`, etc.）
  - `startHour` (Number) - 開始時間（0-23）
  - `endHour` (Number) - 終了時間（0-23）
  - `energyLevel` (String) - エネルギーレベル
- `stats` (Map) - 統計情報
  - `forks` (Number) - Fork数
  - `applications` (Number) - 適用数
  - `likes` (Number) - いいね数
- `likedBy` (List of String) - いいねしたユーザーIDリスト
- `createdAt` (String) - ISO 8601形式の作成日時
- `updatedAt` (String) - ISO 8601形式の更新日時

**Global Secondary Index (GSI)**:
- **GSI名**: `owner-visibility-index`
- **Partition Key**: `owner` (String)
- **Sort Key**: `visibility` (String)
- **用途**: 所有者と公開設定でRoutineを検索

**例**:
```json
{
  "routineId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "集中型ワークフロー",
  "description": "午前中に集中時間を確保するRoutine",
  "purpose": "集中力を最大化する",
  "owner": "routinehub.dev@gmail.com",
  "visibility": "public",
  "durationType": "weekly",
  "intensity": "steady",
  "tags": ["集中", "休息", "リズム"],
  "timeBlocks": [
    {
      "id": "block-1",
      "label": "集中時間",
      "objective": "深い集中を維持",
      "day": "monday",
      "startHour": 9,
      "endHour": 12,
      "energyLevel": "high"
    }
  ],
  "stats": {
    "forks": 32,
    "applications": 141,
    "likes": 15
  },
  "likedBy": ["user1@example.com", "user2@example.com"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## 環境変数

```env
# DynamoDB設定
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# テーブル名（開発/本番で切り替え可能）
DYNAMODB_USER_SETTINGS_TABLE=routine-hub-user-settings
DYNAMODB_ROUTINES_TABLE=routine-hub-routines

# DynamoDBエンドポイント（ローカル開発用）
# DynamoDB Localを使用する場合: http://localhost:8000
# 本番環境では未設定（AWS DynamoDBを使用）
DYNAMODB_ENDPOINT=
```

## 実装方針

1. **リポジトリパターンの維持**: 現在の`userSettingsRepository`と`routinesRepository`のインターフェースを維持
2. **型安全性**: TypeScriptの型定義を維持
3. **段階的移行**: In-memoryストアとDynamoDBストアを切り替え可能にする
4. **エラーハンドリング**: DynamoDBのエラーを適切に処理
5. **データ移行**: 既存のIn-memoryデータをDynamoDBに移行するスクリプトを用意
