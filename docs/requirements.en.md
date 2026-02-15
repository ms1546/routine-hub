# Routine Hub – Requirements Specification

---

## 1. Overview

### Product Name

Routine Hub

### Description

Routine Hub is a web application that allows users to reuse, customize, and apply recurring routines (habits) to their personal schedules with AI assistance.
While the interface copy stays in English for Phase 2, mock data and workflow examples should reflect Japanese working styles so that local reviewers can relate to the scenarios.

The application integrates with Google Calendar and treats it as the single source of truth. AI is used strictly as a proposal and evaluation mechanism, never as an autonomous decision-maker.

This product is designed as an **AI-operated system**, not merely an AI-powered application.

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

## 2. Product Principles

### 2.1 User Sovereignty

* AI must never automatically confirm or modify schedules
* All conflicts require explicit user confirmation
* AI outputs are proposals only

### 2.2 Routine Definition

* A Routine represents a recurring habit or activity
* The minimum duration of a Routine block is **3 hours**
* Micro-task management is explicitly out of scope

### 2.3 Calendar Authority

* Google Calendar is the only authoritative schedule
* Routine Hub must not maintain its own calendar state
* All calendar writes must be idempotent

---

## 3. Core Features

### 3.1 Routine Management

* Users can create routines
* Users can publish routines publicly
* Users can fork other users' routines
* Routine history and branching are out of scope (MVP)

Each Routine includes:

* Name
* Description
* Purpose
* Duration type (half-day / full-day / weekly)
* Time blocks (>= 1 day)
* Tags
* Visibility (public / private)

---

### 3.2 Customization and Scheduling

* Users can customize a routine to fit their own constraints
* Manual adjustments must always be supported
* Users select the date range for applying routines

---

### 3.3 Google Calendar Integration

* OAuth-based authentication
* Read existing calendar events
* Insert routine blocks into Google Calendar
* Support recurring schedules
* Google Calendar remains the master record

---

## 4. AI-Assisted Optimization

### 4.1 Usage Restrictions

* AI features require authentication
* Regular users may execute AI optimization **once only**
* Admin users have no execution limits

### 4.2 AI Responsibilities

* Summarize user constraints
* Interpret routine intent
* Detect scheduling conflicts
* Propose multiple scheduling alternatives
* Generate future-impact commentary

### 4.3 AI Limitations

* AI must not auto-resolve conflicts
* AI must not finalize schedules
* AI must not claim predictive certainty

---

## 5. Future Projection

* Future projections are presented as AI-generated commentary
* Projections are explanatory, not predictive guarantees
* Numeric calculations may be used internally but are not authoritative

---

## 6. Evaluation and LLMOps

### 6.1 LLM-as-Judge

* AI outputs are evaluated using LLM-as-Judge via Mastra
* Evaluation focuses on:

  * Clarity
  * Consistency
  * Respect for user constraints
  * Quality of explanation

### 6.2 Human Evaluation

* Human evaluators may add manual scores and comments via Langfuse
* LLM and human evaluations are treated as decision inputs, not truth

### 6.3 Observability

* Prompts and evaluations are versioned
* Improvement decisions must be traceable

---

## 7. Non-Functional Requirements

* Deployment: AWS ECS (Fargate)
* Cost optimization via scheduled shutdown
* Resilience to restarts
* Automated testing required
* UI quality enforced via human review

---

## 8. Explicit Non-Goals

* Fully autonomous scheduling
* Guaranteeing habit success
* High-frequency task management
* Real-time collaboration

---

## 9. Summary

Routine Hub prioritizes explainability, user trust, and operational realism. AI is treated as an assistive, evaluated component within a human-centered workflow.
