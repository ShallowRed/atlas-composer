# Critical Rules Checklist

## Before Starting ANY Task
1. Read `docs/architecture.llm.txt` FIRST to understand context
2. Identify which domain-specific `.llm.txt` files are relevant
3. Choose approach: Direct Editing (1-3 files) or Plan-First (4+ files)

## During Code Changes
1. Track which `.llm.txt` files need updates based on behavior changes
2. For 4+ file changes: Create `<name>.plan.llm.txt` with checklist
3. Never use emojis in code, comments, docs, or responses

## After Code Changes (CRITICAL - Most Often Forgotten)
1. Update affected `.llm.txt` documentation files IMMEDIATELY
2. Use STATIC REFERENCE style in `.llm.txt` files:
   - Present tense only ("handles", "provides", "uses")
   - NO temporal language: "before/after", "completed", "resolved", "Phase X"
   - NO dates, objectives, or problem descriptions
   - Describe HOW it works NOW, not how it changed
3. Plan files (`.plan.llm.txt`) CAN use historical language
4. Verify changes compile/run correctly

## Documentation Types
- **`.llm.txt`** = Static reference (timeless, current state only)
- **`.plan.llm.txt`** = Historical tracking (objectives, dates, before/after OK)
- **`.md`** = Never mention unless user explicitly asks

## Quick Self-Check
Ask yourself after completing work:
- Did I update the relevant `.llm.txt` files?
- Did I remove temporal language from `.llm.txt` files?
- Does the documentation describe the current state, not the change?
- For large tasks: Did I create/update the plan file?

## Common Violations to Avoid
1. Implementing feature but not updating `.llm.txt` docs
2. Adding "completed" or "Phase X" markers to `.llm.txt` files
3. Leaving future enhancements in docs when feature is implemented
4. Using "we added" or "this was changed" in reference docs
5. Forgetting to mark plan file tasks as complete

## Token Budget Management
When conversation grows long:
- Summaries MUST include "Critical Rules Compliance" section
- Reference this file in summaries for quick re-orientation
- Include list of updated `.llm.txt` files in summary
