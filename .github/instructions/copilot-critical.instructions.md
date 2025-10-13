---
description: Copilot critical rules checklist
applyTo: "**"
---

# Critical Rules Checklist

> **Purpose**: Quick-reference checklist for every task. For detailed workflows, see `copilot.instructions.md`.

## Before Starting ANY Task
1. Read `docs/architecture.llm.txt` FIRST to understand context
2. Identify which domain-specific `.llm.txt` files are relevant
3. Choose approach: Direct Editing (1-3 files) or Plan-First (4+ files)
4. Choose chatmode: **Plan** for analysis, **Edit** for implementation

## During Code Changes
1. Track which `.llm.txt` files need updates based on behavior changes
2. For 4+ file changes: Switch to **Plan chatmode** to create `<name>.plan.llm.txt`
3. Never use emojis in code, comments, docs, or responses

## After Code Changes (CRITICAL - Most Often Forgotten)
1. **WAIT FOR USER VALIDATION** - When investigating a bug or issue, do NOT update documentation until user confirms fix works
2. Update affected `.llm.txt` documentation files ONLY after user validates in case of bug fixes
3. Use STATIC REFERENCE style in `.llm.txt` files:
- Present tense only ("handles", "provides", "uses")
- NO temporal language: "before/after", "completed", "resolved", "Phase X"
- NO dates, objectives, or problem descriptions
- Describe HOW it works NOW, not how it changed
4. Plan files (`.plan.llm.txt`) CAN use historical language
5. Verify changes compile/run correctly

## Documentation Types
- **`.llm.txt`** = Static reference (timeless, current state only)
- **`.plan.llm.txt`** = Historical tracking (objectives, dates, before/after OK)
- **`.md`** = [CRITICAL] NEVER MENTION OR TRY TO CREATE OR UPDATE ANY MARKDOWN FILE unless user explicitly asks

## Chatmode Usage
- **Plan chatmode** (`.github/chatmodes/plan.chatmode.md`):
  - Read-only analysis and planning
  - Creates `.plan.llm.txt` files
  - No code edits
  - Tools: fetch, githubRepo, search, usages, getErrors
  
- **Edit chatmode** (`.github/chatmodes/edit.chatmode.md`):
  - Full implementation mode
  - Makes code changes across files
  - Updates documentation
  - Tools: all available

- **Switch anytime**: User can switch modes via Chat view dropdown

## Quick Self-Check
Ask yourself after completing work:
- Did I update the relevant `.llm.txt` files?
- Did I remove temporal language from `.llm.txt` files?
- Does the documentation describe the current state, not the change?
- For large tasks: Did I create/update the plan file?
- Did I use appropriate chatmode for the task?

## Common Violations to Avoid
1. **UPDATING DOCS BEFORE USER VALIDATES FIX** - NEVER document until user confirms it works
2. Implementing feature but not updating `.llm.txt` docs (after validation)
3. Adding "completed" or "Phase X" markers to `.llm.txt` files
4. Leaving future enhancements in docs when feature is implemented
5. Using "we added" or "this was changed" in reference docs
6. Forgetting to mark plan file tasks as complete
7. Making edits in Plan chatmode (read-only!)

## Token Budget Management
When conversation grows long:
- Summaries MUST include "Critical Rules Compliance" section
- Reference this file in summaries for quick re-orientation
- Include list of updated `.llm.txt` files in summary
