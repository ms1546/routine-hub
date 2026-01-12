# Development Tools & MCP Usage

## Overview

This project was developed using AI agents extended via **MCP (Model Context Protocol)**.

MCP is used strictly as a **development-time productivity and reasoning aid**.
MCP configurations are intentionally **not included in this repository**, as they are highly environment-specific and may require sensitive permissions.

The application itself does **not depend on MCP** to build, run, or deploy.

---

## Why MCP Is Used

Routine Hub emphasizes:

* Clear architectural reasoning
* Correct use of cloud services
* Explainable AI workflows
* High UI quality with human review

MCP tools are used to:

* Improve design accuracy
* Reduce hallucination when referencing documentation
* Support iterative reasoning during development

---

## MCP Tools Used in This Project

### aws-docs MCP

**Purpose**:

* Reference official AWS documentation during design and implementation
* Validate architectural decisions around ECS Fargate, EventBridge, IAM, and cost optimization

**Why it matters**:

* Prevents incorrect assumptions about AWS services
* Improves accuracy of infrastructure explanations in documentation
* Ensures realistic, production-aligned design choices

---

### storybook MCP(Add-on)

**Purpose**:

* Assist in designing Storybook stories
* Reason about UI states and visual regression scenarios
* Support Chromatic-based human review workflows

**Why it matters**:

* UI quality is validated by humans, not automation alone
* Storybook stories act as UI specifications
* MCP helps reason about edge cases and state combinations

---

### Other MCP Tools

The following MCP tools are also used to support development:

* **github MCP**: repository analysis, PR review, workflow reasoning
* **next-devtools MCP**: App Router, Server Components, and Server Actions reasoning
* **mastra-docs MCP**: AI agent, workflow, and evaluation design
* **chrome-devtools MCP**: UI inspection and debugging
* **context7 / serena / ultracite MCP**: long-context reasoning and document organization
* **shadcn**

---

## Why MCP Configuration Is Not Committed

MCP configurations are intentionally excluded because:

* They are highly environment-dependent
* They may include sensitive permissions or credentials
* They are part of the developer toolchain, not the product

This follows the same principle as excluding IDE-specific settings.

---

## Summary

Routine Hub demonstrates not only the use of AI in an application,
but also the **design of an AI-augmented development environment**.

MCP is used to support reasoning, accuracy, and quality,
while keeping the product itself independent, secure, and portable.
