# Routine Hub – Architecture

## Overview

Routine Hub is a habit-design web application that integrates AI assistance while preserving user sovereignty. The system is designed for clarity, operational realism, and continuous improvement through LLMOps.

Key goals:

* Keep users in control of final decisions
* Use Google Calendar as the single source of truth
* Operate AI as an evaluated, improvable system
* Minimize infrastructure and operational complexity

---

## Core Principles

### User Sovereignty

* AI never auto-confirms schedules
* All conflicts require explicit user confirmation
* AI outputs are proposals, not decisions

### Google Calendar as Source of Truth

* Routine Hub does not maintain its own calendar state
* All schedule writes are idempotent
* Google Calendar is the authoritative timeline

### AI as an Operated System

* AI quality is not assumed
* Outputs are evaluated using LLM-as-Judge
* Human evaluation is supported
* Improvement decisions are traceable

---

## Application Structure Philosophy

### Why Not Strict Clean Architecture

Next.js App Router already provides strong structural boundaries:

* Server Components for UI
* Server Actions for mutations
* lib/ for integrations and shared logic

Strict Clean Architecture would introduce unnecessary ceremony at this stage. Instead, we adopt soft boundaries:

* UI logic in app/
* External integrations and business helpers in lib/
* AI workflows isolated under lib/ai/

---

## Runtime Architecture

User Browser
→ Next.js App Router
→ Server Components / Server Actions
→ lib/

* ai (Mastra workflows, agents, evaluation)
* calendar (calendar integration abstraction)
* db (DynamoDB access)
* auth (OAuth helpers)

→ AWS Services

* ECS Fargate
* DynamoDB
* Bedrock
* Langfuse
* Secrets Manager

→ External Services

* Google OAuth 2.0
* Google Calendar API

---

### Note on Google Cloud Platform Usage

Google Cloud Platform is **not used as an application runtime** in this architecture.

GCP is required **only** for the following purposes:

* Registration and management of Google OAuth 2.0 clients
* Configuration of the OAuth consent screen
* Enabling access to Google Calendar API

All application logic, data processing, AI workflows, token storage,
and operational control are executed entirely within AWS.

GCP functions strictly as an external identity and calendar API provider.

---

## AI Architecture (Mastra)

### Workflow-Based Design

* Each AI capability is implemented as a workflow
* Workflows consist of small, single-responsibility agents

### Agent Responsibilities

* Profile Agent: summarize user constraints
* Routine Interpreter Agent: extract routine intent
* Calendar Conflict Agent: detect conflicts (no resolution)
* Optimization Agent: propose alternatives with rationale
* Future Simulation Agent: generate explanatory projections

---

## LLMOps Architecture

### Mastra

* Executes workflows
* Runs LLM-as-Judge evaluations
* Produces structured evaluation results

### Langfuse

* Central observability hub
* Stores prompts and versions
* Collects LLM and human evaluation scores
* Enables traceable improvement decisions

---

## Resilience and Cost Optimization

### Execution Model

* AI tasks are short-lived and retryable
* No critical state is kept in memory

### Scheduled Availability

* ECS services and ALB are stopped during off-hours
* EventBridge controls start/stop schedules
* Maintenance mode UI is shown when stopped

---

## Explicit Non-Goals

* Fully autonomous AI decision-making
* Persistent storage of AI intermediate outputs
* Over-optimized scaling or microservices

---

## Summary

Routine Hub prioritizes trust, explainability, and operational realism.
It is designed not merely as an AI-powered app, but as an AI-operated system
that can be evaluated, improved, and explained.
