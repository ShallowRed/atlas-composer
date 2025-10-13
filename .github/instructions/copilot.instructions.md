---
description: Copilot instructions
applyTo: "**"
---

# Atlas Composer - Copilot Instructions

## Project Overview
Interactive web application for creating custom cartographic visualizations using composite projections.
- **Stack**: Vue.js 3, TypeScript, Vite, D3.js, Observable Plot, Pinia, Tailwind CSS, DaisyUI 5
- **Key Features**: Multi-atlas support, Natural Earth integration, composite projections, JSON-driven configuration

## Documentation System

### Structure
The project uses `.llm.txt` files as the single source of truth:
- `docs/architecture.llm.txt` - Start here, read FIRST for any task
- Domain-specific files: `atlases.llm.txt`, `projections.llm.txt`, `services.llm.txt`, `vue-architecture.llm.txt`, `scripts.llm.txt`

### File Types
- **`.llm.txt`**: Static reference documentation (timeless, present tense only)
- **`.plan.llm.txt`**: Historical tracking (objectives, dates, progress)
- **`.md`**: Only touch if user explicitly asks

## Chatmodes

Two specialized modes available (user switches via Chat view dropdown):

- **Plan Mode**: Read-only analysis, creates `.plan.llm.txt` files (4+ file changes)
- **Edit Mode**: Full editing capability, implements plans or direct changes

## Workflow

> **CRITICAL**: Read `.github/instructions/copilot-critical.instructions.md` for compliance checklist before every task.

### Standard Flow
1. Read `docs/architecture.llm.txt` + relevant domain `.llm.txt` files
2. Choose approach:
   - **Direct** (1-3 files): Make changes immediately
   - **Plan-First** (4+ files): Switch to Plan chatmode, create `.plan.llm.txt`, then implement
3. **WAIT FOR USER VALIDATION** before updating any documentation in case of bug fixes
4. Update affected `.llm.txt` docs (ONLY after user confirms fix works in case of bugs)
5. Verify compilation

## Plan File Structure
Create `<descriptive-name>.plan.llm.txt` in project root:

```markdown
# [Feature Name] - Implementation Plan

## Objective
[Clear goal statement]

## Affected Domains
- [ ] Domain 1 (docs/domain1.llm.txt) - [reason]
- [ ] Domain 2 (docs/domain2.llm.txt) - [reason]

## Context
- Architecture: docs/architecture.llm.txt
- Domain docs: docs/[domain].llm.txt

## Changes

### Phase 1: [Phase Name]
- [ ] File: path/to/file.ts
  - Action: [what to change]
  - Why: [rationale]

## Documentation Updates
- [ ] docs/domain1.llm.txt - [update in present tense]
- [ ] docs/domain2.llm.txt - [update in present tense]

## Verification
- [ ] Code compiles without errors
- [ ] Tests pass (if applicable)
- [ ] All .llm.txt documentation updated
- [ ] No temporal language in .llm.txt files

## Status
Status: [PLANNED | IN_PROGRESS | COMPLETE]
Last Updated: YYYY-MM-DD
```

## Code Patterns
- TypeScript strict mode
- No emojis (code, comments, docs, responses)
- Follow existing patterns in codebase
- Concise explanations

## Terminal Usage
- Long-running processes (dev servers): `isBackground=true`
- Quick commands (build, test): `isBackground=false`
- Use absolute paths or '.'

## External Tools
- Context7 MCP: Library documentation (working)
- Console Ninja MCP: Do NOT use (not working)