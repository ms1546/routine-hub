# Routine Hub
要件定義書・機能設計書（最終版）

---

# 1. 要件定義書

## 1.1 アプリケーション概要

### アプリケーション名
Routine Hub

### 概要
Routine Hub は、他人が設計した「習慣（Routine）」を再利用・Forkし、
AI の補助を受けながら **自分の生活制約に合わせて Google カレンダーへ反映できる**
習慣設計支援 Web アプリケーションである。

本アプリケーションは
**「AI を使うこと」ではなく「AI を運用・改善できること」**を重視して設計されている。

---

## 1.2 背景・課題

- 習慣化・学習・健康改善のノウハウは多いが、実行に落とし込むコストが高い
- Notion 等のテンプレートはカレンダーと分断されている
- AI による自動最適化は便利だが、ブラックボックス化や予定破壊の懸念がある
- AI の判断や改善理由を説明できないアプリが多い

---

## 1.3 解決方針（プロダクト思想）

### AI に関する基本方針（重要）
- AI は **提案と評価のみ**を行う
- AI は予定を自動で確定しない
- 衝突は必ずユーザー確認を挟む
- 将来予測は保証しない
- AI 実行回数は制限する（admin 除外）

### 習慣（Routine）の定義
- Routine は「繰り返し前提のまとまった行動」
- 最小単位は **3時間**
- 細かいタスク管理は対象外

---

## 1.4 想定ユーザー

- Google カレンダーを日常利用している知的労働者
- 習慣化・学習・健康改善に関心がある
- AI を補助として受け入れられるユーザー

---

## 1.5 技術スタック（前提）

### フロントエンド / バックエンド
- Next.js（App Router）
- TypeScript
- Server Actions 中心
- shadcn/ui

### AI / LLM
- AWS Bedrock
- Mastra（AI Agent / Workflow / 評価）
- Langfuse（LLMOps / 可視化 / 判断支援）

### インフラ
- AWS ECS on Fargate Spot
- EventBridge（夜間停止・起動）
- DynamoDB
- CloudWatch

### 認証
- Google OAuth（Cognito 経由）

### CI/CD・テスト
- GitHub Actions
- Unit Test / Integration Test
- Storybook
- Chromatic（Visual Review 必須）

---

## 1.6 認証・権限制御

### ロール
- user
- admin

### 機能別アクセス制御

| 機能 | 未ログイン | ログイン | admin |
|---|---|---|---|
| Routine 一覧閲覧 | 可 | 可 | 可 |
| Routine 詳細閲覧 | 可 | 可 | 可 |
| Fork | 可（仮保存） | 可 | 可 |
| 手動編集 | 不可 | 可 | 可 |
| AI 最適化 | 不可 | 初回1回のみ | 無制限 |
| Google カレンダー連携 | 不可 | 可 | 可 |

---

## 1.7 非機能要件

- 可用性：Fargate Spot 前提で許容
- セキュリティ：OAuth + 最小権限
- 拡張性：Agent / Workflow 追加可能
- 運用性：夜間停止・再起動前提
- テスト：自動テスト＋人間レビュー必須

---

# 2. 機能設計書

---

## 2.1 Routine 管理機能

### Routine 属性
- Routine ID
- 名称
- 作成者
- 目的（自由記述）
- 説明
- 期間タイプ（半日 / 1日 / 1週間）
- 時間ブロック（1日）
- 公開範囲（public / private）
- タグ

### 機能
- 公開 Routine の閲覧
- 自身の Routine 作成
- 他人の Routine の Fork
- 手動編集（時間・順序）

---

## 2.2 Google カレンダー連携

### 方針
- Google カレンダーを **唯一のマスター**とする
- Routine Hub は提案・生成ツール

### 機能
- Google OAuth 連携
- 既存予定取得
- Routine を期間指定で展開
- 繰り返し設定対応
- 冪等な予定反映（再実行可能）

---

## 2.3 AI 最適化機能

### 実行条件
- ログイン済み
- user は初回 1 回のみ
- admin は制限なし

### AI が行うこと
- ユーザー制約の要約
- Routine の意図解釈
- 予定衝突の検出
- 複数の最適化案提示
- 将来予測コメント生成

### AI が行わないこと
- 予定の自動確定
- 衝突の自動解消
- 最適解の断定

---

## 2.4 AI ワークフロー設計

### Agent 構成

1. Profile Agent
   - ユーザーの予定密度・制約を要約

2. Routine Interpreter Agent
   - Routine の目的・柔軟性を解釈

3. Calendar Conflict Agent
   - 衝突を検出・列挙（解決しない）

4. Optimization Agent
   - 複数の配置案と理由を提示

5. Future Simulation Agent
   - 継続時の影響をコメント生成

---

## 2.5 LLMOps 設計（重要）

### 評価方針
- Mastra による **LLM as Judge**
- Langfuse による評価の一元管理
- 人間評価（Manual Score）を併用

### LLM as Judge が評価する観点
- 説明の具体性
- ユーザー制約の尊重
- 衝突への配慮
- 提案理由の一貫性

### Langfuse の役割
- Prompt / Judge Prompt のバージョン管理
- LLM 評価結果の可視化
- 人間評価の追加
- 改善判断プロセスの履歴化

---

## 2.6 テスト戦略

### テストレイヤ構成
1. Unit Test
2. Integration Test
3. Storybook + Chromatic

### 方針
- ロジックの正しさは自動テストで保証
- UI の妥当性は **人間の Visual Review を必須**
- 全 Story が Approve されない限り CI を成功させない

---

## 2.7 データ永続化方針

### 永続化するもの
- Routine 定義
- Fork 情報
- AI 実行イベント（回数管理）
- ユーザー設定

### 永続化しないもの
- AI 提案結果
- 衝突一覧
- 将来予測コメント
- 調整途中状態

### 原則
「人が決めた事実のみ永続化する」

---

## 2.8 インフラ・運用設計

### Fargate Spot 運用
- 常時稼働しない
- 夜間は ECS / ALB を停止
- EventBridge による自動起動・停止

### 障害時
- Spot 割り込みは前提
- AI 処理は短時間・再実行可能
- Google カレンダー反映は冪等設計

### UX
- 停止中はメンテナンス画面表示
- 状態・制限は明示的に表示

---

## 2.9 今後の拡張想定

- Routine 評価（Like / Star）
- Fork 派生関係の可視化
- AI 実行回数の課金化
- 習慣達成ログ連携

---

## 3. まとめ

Routine Hub は以下を重視して設計されている。

- AI を過信しない設計
- 人間の意思決定を尊重
- 実運用を前提としたインフラ
- LLMOps を前提とした改善可能な構造

本アプリケーションは
「AI を使ったアプリ」ではなく
**「AI を運用・評価・改善できるアプリケーション」**である。
