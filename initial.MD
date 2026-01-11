# Codex Initial Prompt (MCP-Aware)

Use the following documents as **authoritative specifications**:

* docs/requirements.en.md
* docs/architecture.md
* docs/testing-strategy.md
* docs/development-tools.md
* .codex/instructions.md

Do **not** modify the requirements or architectural assumptions.

---

## MCP Assumptions

During development, AI agents may have access to MCP tools such as:

* aws-docs MCP
* storybook MCP
* github MCP
* next-devtools MCP
* mastra-docs MCP

You may assume that accurate and up-to-date documentation can be referenced
when reasoning about AWS services, Storybook workflows, Terraform design,
and AI agent architecture.

However:

* Do not depend on any MCP configuration files being present in the repository
* Do not require MCP to build or run the application

---

## Implementation Instructions

Please implement a prototype of **Routine Hub** based on the documents above.

### Phase 1: Foundation

1. Set up the basic Next.js App Router structure
2. Implement Routine list and Routine detail pages
3. Define basic data models and mock persistence
4. Create minimal UI components
5. Add Storybook stories for all UI components

### Constraints

* Use TypeScript
* Use Next.js App Router
* Use Server Actions for mutations
* Do not implement real AI or Google Calendar calls
* Mock all external services

---

## Testing Requirements

* Add unit tests for core logic
* Add integration tests for Server Actions
* All LLM calls must be mocked
* Storybook must be included
* UI changes must be reviewable via Storybook

---

## Important Behavioral Rules

* AI outputs must always be treated as proposals
* Do not auto-confirm any schedules
* Do not auto-resolve conflicts
* Prefer clarity and correctness over feature completeness

---

After completing Phase 1, stop and wait for further instructions before implementing:

* AI workflows
* Mastra integration
* Langfuse integration
* Google Calendar integration
