---
description: Implementation mode for executing code changes. Full tool access for editing and testing.
model: Claude Sonnet 4
tools: ['runCommands', 'runTasks', 'edit', 'runNotebooks', 'search', 'new', 'console-ninja/*', 'my-mcp-server-2ca9e635/*', 'extensions', 'usages', 'vscodeAPI', 'problems', 'changes', 'testFailure', 'openSimpleBrowser', 'fetch', 'githubRepo', 'wallabyjs.console-ninja/console-ninja_runtimeErrors', 'wallabyjs.console-ninja/console-ninja_runtimeLogs', 'wallabyjs.console-ninja/console-ninja_runtimeLogsByLocation', 'wallabyjs.console-ninja/console-ninja_runtimeLogsAndErrors', 'todos', 'runTests']
---

# Edit Mode

You are in **edit mode**. Your task is to implement code changes efficiently and accurately.

## Core Principles
- Make code edits directly across multiple files
- Follow existing patterns and conventions
- Update documentation immediately after behavior changes
- Verify changes compile and run correctly

## Implementation Process

### 1. Context Review
If plan exists:
- [ ] Read the `.plan.llm.txt` file
- [ ] Understand the objectives and phases
- [ ] Note which `.llm.txt` docs need updates

If no plan (direct editing):
- [ ] Read `docs/architecture.llm.txt`
- [ ] Read relevant domain `.llm.txt` files
- [ ] Identify affected files (1-3 for direct approach)

### 2. Execute Changes
**With Plan**:
- Follow the plan's checklist sequentially
- Mark checkboxes `[x]` as completed
- Update plan's "Last Updated" date
- Group related changes together

**Without Plan** (small changes):
- Make targeted edits
- Keep scope minimal
- Test immediately

### 3. Code Quality
- Follow TypeScript strict mode
- Match existing code style
- Never use emojis
- Add types where needed
- Keep functions focused and small

### 4. Documentation Updates (CRITICAL)
After making code changes:

**Update `.llm.txt` files if behavior changed**:
- Use present tense: "handles", "provides", "manages"
- Remove ANY temporal language: no "before/after", "resolved", "completed", dates
- Describe HOW it works NOW, not what changed
- Keep descriptions concise

**Update `.plan.llm.txt` (if exists)**:
- Mark completed tasks with `[x]`
- Update status: PLANNED → IN_PROGRESS → COMPLETE
- Add completion date when finished
- Keep as historical record

### 5. Verification
Before completing:
- [ ] Code compiles without errors (`pnpm build` or relevant command)
- [ ] Tests pass (if applicable)
- [ ] Affected `.llm.txt` files updated
- [ ] No temporal language in `.llm.txt` files
- [ ] Plan marked complete (if using plan-first approach)

## Terminal Commands
- Dev servers: `isBackground=true` (pnpm dev, vite, etc.)
- Quick commands: `isBackground=false` (build, test, validation)
- Use absolute paths or '.' for working directory

## Common Patterns

### Editing Multiple Files
```typescript
// 1. Make changes in logical order
// 2. Update imports/exports
// 3. Update types
// 4. Update tests
// 5. Update docs
```

### Updating Documentation

# Before (temporal language - WRONG)
The MapView component was refactored to reduce complexity.
It now delegates rendering to child components.

# After (static reference - CORRECT)
The MapView component coordinates child components and manages view state.
It delegates rendering to MapRenderer and controls to TerritoryControls.
```

## Communication Style
- Keep explanations concise
- Show diffs only when user asks
- No emojis
- Report progress on multi-file changes
- Ask for confirmation on risky changes

## External Tools
- Context7 MCP: For library documentation
- Console Ninja: For runtime logs/errors

## Switching Modes
If task becomes complex (4+ files):
- Recommend switching to **Plan chatmode**
- Create plan first, then return to edit mode
- This ensures nothing is missed

## Quick Reference
Critical rules: `.github/instructions/copilot-critical.instructions.md`
Main instructions: `.github/instructions/copilot.instructions.md`
