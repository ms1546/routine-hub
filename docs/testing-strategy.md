# Routine Hub – Testing Strategy

## Purpose

The testing strategy of Routine Hub aims to ensure correctness, prevent regressions, and enforce UI quality, while acknowledging that AI outputs are probabilistic and must not be blindly trusted.

---

## Testing Layers

The system uses a layered testing approach:

1. Unit Tests
2. Integration Tests
3. Storybook + Chromatic (Human Visual Review)

---

## Unit Tests

### Scope

* Routine validation rules
* Time block calculations (minimum 3 hours)
* Conflict detection logic
* AI input/output schema validation

### Principles

* LLM calls are always mocked
* Tests validate contracts, not AI intelligence
* No network calls are allowed

### Examples

* Routine blocks shorter than 3 hours are rejected
* Conflict detection returns correct dates
* Invalid AI responses fail schema validation

---

## Integration Tests

### Scope

* Next.js Server Actions
* Routine optimization workflow (mocked LLM)
* Google Calendar integration (stubbed)

### Principles

* External APIs are never called
* Idempotency of calendar writes is tested
* Spot interruption tolerance is assumed

---

## Storybook Testing

### Scope

* All UI components
* Key UI states:

  * Normal
  * Conflict detected
  * AI unavailable
  * AI execution limit reached
  * Maintenance mode

### Philosophy

* Each Story represents a UI contract
* Stories act as living visual specifications

---

## Chromatic Integration

### Rules

* Storybook is deployed to Chromatic on every pull request
* Visual changes require explicit human approval
* CI fails unless all stories are approved

### Rationale

* UI correctness is subjective
* AI-assisted apps require clarity and trust
* Human judgment is mandatory for visual intent

---

## Relationship to LLMOps

| Concern              | Testing | LLMOps  |
| -------------------- | ------- | ------- |
| Determinism          | Yes     | No      |
| Regression           | Yes     | Partial |
| Quality Judgment     | No      | Yes     |
| Improvement Tracking | No      | Yes     |

Testing ensures correctness.
LLMOps ensures quality evolution.

---

## Summary

Routine Hub enforces quality by:

* Automating what can be automated
* Requiring humans where judgment matters
* Treating AI as a probabilistic system

This balance is intentional and explicit.
