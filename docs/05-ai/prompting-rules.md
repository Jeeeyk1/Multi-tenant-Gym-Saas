# Prompting Rules

This document defines how to write prompts for AI (Claude).

The goal is:
- reduce hallucination
- improve consistency
- enforce architecture

---

## General principles

Bad prompt:

"implement membership system"

Good prompt:

- defines scope
- defines constraints
- defines context to read
- requires planning before coding

---

## Standard structure

Every prompt should include:

### 1. Task
What needs to be done

### 2. Goal
Why it exists

### 3. Read first
List of required files

### 4. Constraints
Architecture and rules

### 5. Output format
What AI must produce first

---

## Example prompt

```md
Task: Implement member renewal use case

Goal:
Allow staff to renew a member's membership

Read first:
- CLAUDE.md
- docs/01-architecture/backend-architecture.md
- docs/01-architecture/multi-tenancy.md
- docs/02-domains/members.md
- docs/03-engineering/backend-standards.md

Constraints:
- Must enforce gymId scope
- Use use-case pattern
- Keep controller thin
- Use transactions

Output first:
1. Understanding
2. Files to modify
3. Assumptions
4. Plan

Then implement code

Two-step workflow
Always prefer:

Step 1: Plan
understanding
assumptions
files to change
risks
Step 2: Code
only after plan is validated
Anti-hallucination rules
Always require AI to:

state assumptions
list files it read
avoid inventing requirements
reuse existing patterns
Scope control
Prompts should include:

what NOT to change
boundaries of work
Example:

"Do not modify other modules" "Do not refactor unrelated code"

When requirements are unclear
AI must:

state uncertainty
make minimal assumptions
not invent complex behavior
Prompt types
Create templates for:

feature implementation
bug fixing
refactoring
DB migration
API endpoint