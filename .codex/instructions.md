# Codex Implementation Instructions

You must follow the requirements defined in `docs/requirements.en.md`.

## General Rules
- Do NOT change the requirements or assumptions.
- If something is unclear, make a reasonable assumption and document it in comments.
- Prefer clarity and simplicity over over-engineering.

## Architecture
- Use Next.js App Router.
- Use TypeScript.
- Use Server Actions for mutations.
- Do NOT enforce strict Clean Architecture.
- Organize external integrations under `lib/`.

## AI / LLM
- AI logic must be placed under `lib/ai`.
- Do NOT auto-confirm schedules.
- AI outputs must be treated as proposals only.

## Testing
- Unit tests and integration tests must be included.
- LLM calls must be mocked.
- Storybook must be created for all UI components.
- Chromatic approval is required for CI success.

## Out of Scope
- Payments
- High traffic scaling
- Production-grade security hardening
