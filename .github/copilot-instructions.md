## Project Overview
- Project: Atlas Composer - Interactive web application for creating custom cartographic visualizations of countries with geographically-scattered territories using composite projections.
- Technologies: Vue.js 3, TypeScript, Vite, D3.js, Observable Plot, Pinia, Tailwind CSS, DaisyUI
- Key Features: Multi-atlas support (France, Portugal, Spain, EU), Natural Earth integration,
- composite projections, interactive territory positioning, JSON-driven configuration

## LLM Documentation Guidelines

DOCUMENTATION STRUCTURE:
- ALWAYS read `docs/architecture.llm.txt` FIRST before starting any task
- Use architecture.llm.txt as an index to locate domain-specific documentation
- ONLY use `.llm.txt` files - they are the SOLE source of truth for this project
- NEVER reference, mention, or suggest .md files unless explicitly asked by user
- Each domain/concept has a dedicated `.llm.txt` file for detailed information
- These files minimize token usage through concise, structured content

WORKFLOW:
1. Read `docs/architecture.llm.txt` to understand:
  - Project structure and organization
  - Core concepts and patterns
  - Domain boundaries
  - References to specific domain files

2. Based on the task, read relevant domain-specific `.llm.txt` files:
  - `docs/atlases.llm.txt` - Atlas system and configuration
  - `docs/projections.llm.txt` - Projection definitions and parameters
  - `docs/services.llm.txt` - Service layer architecture
  - `docs/scripts.llm.txt` - Build and data preparation scripts
  - Additional domain files as referenced

3. Choose appropriate editing approach based on task complexity:
  - **Direct Editing** (small to medium tasks)
  - **Plan-First Approach** (large refactoring tasks)

4. Execute the task using the acquired context

5. Update llm documentation if changes affect documented behavior:
  - For minor changes: Update relevant .llm.txt files immediately
  - For major refactoring: Ask user whether to update documentation now or continue editing
  - Always keep documentation synchronized with code reality
  - ONLY work with .llm.txt files - do NOT create, edit, or reference .md files
  - IMPORTANT: .llm.txt files are STATIC REFERENCE docs - remove all historical/temporal language
    - Remove: "before/after", "resolved", "completed", dates, objectives, problems
    - Keep: current state, how it works, what it does

DOCUMENTATION MAINTENANCE:
- Treat .llm.txt files as source of truth for architecture and patterns
- When implementation diverges from documentation, update docs or ask user
- Keep files concise: focus on "what" and "why", not implementation details
- Use references between files to avoid duplication
- Structure information hierarchically: architecture.llm.txt → domain files → code

CRITICAL - Documentation Types:
1. **Reference Documentation (.llm.txt)**: Static, current-state focused
   - Describes HOW the system works NOW
   - No historical information (no "before/after", "resolved", "completed", dates)
   - No problem descriptions or objectives
   - Timeless reference material
   - Example: "MapView.vue coordinates child components"
   - NOT: "MapView.vue was reduced from 528 to 142 lines"

2. **Plan Documentation (.plan.llm.txt)**: Historical, change-tracking
   - Records objectives, problems, and solutions
   - Includes "before/after" states
   - Tracks completion status with dates
   - Documents the journey and decisions
   - Kept as historical record after completion
   - Example: "Objective: Reduce MapView from 528 to 142 lines"

TOKEN OPTIMIZATION:
- Read only necessary files based on task context
- Use architecture.llm.txt as efficient navigation index
- Avoid reading full source files when .llm.txt summaries suffice
- Reference .llm.txt files in conversation summaries for future context

EXTERNAL TOOLS:
- Use Context7 MCP to gather documentation about libraries encountered in the codebase
- Do NOT use Console Ninja MCP (not working currently)

## Code Editing Approaches

### Approach 1: Direct Editing (Small to Medium Tasks)

**Use When**:
- Bug fixes in single file or small set of files
- Adding/modifying single feature or component
- Changes affect 1-3 files
- Clear scope with minimal cross-domain impact
- Context fits comfortably within token budget

**Process**:
1. Read `docs/architecture.llm.txt` to identify relevant domain
2. Read domain-specific `.llm.txt` file(s) for context
3. Read affected source files
4. Make changes directly using editing tools
5. Update relevant `.llm.txt` documentation if behavior changed
6. Verify changes compile/run correctly

**Example Tasks**:
- Fix validation logic in single service
- Add new projection definition
- Update UI component styling
- Modify parameter calculation in one function

### Approach 2: Plan-First Approach (Large Refactoring Tasks)

**Use When**:
- Refactoring affects multiple domains/files (4+ files)
- Architectural changes or pattern implementations
- Complex cross-cutting concerns
- Risk of losing context mid-task
- Changes require coordination across layers

**Process**:
1. Read `docs/architecture.llm.txt` to understand affected domains
2. Read all relevant domain-specific `.llm.txt` files
3. **Create plan file**: `<name>.plan.llm.txt` in project root with:
   - **Objective**: Clear goal statement
   - **Affected Domains**: List domains being modified (for doc updates)
   - **Context**: Links to relevant `.llm.txt` files
   - **Changes**: Structured checklist of all modifications
   - **Documentation Updates**: Which `.llm.txt` files need updates
4. Get user approval of plan (optional but recommended)
5. Execute changes following checklist, marking each with `[x]`
6. Update affected `.llm.txt` documentation files
7. Mark plan as complete, keep file for reference

**Plan File Template**:
```
# <Feature/Refactoring Name> - Implementation Plan

## Objective
<Clear, concise description of what we're implementing/refactoring>

## Affected Domains
- [ ] Domain 1 (docs/domain1.llm.txt) - <reason>
- [ ] Domain 2 (docs/domain2.llm.txt) - <reason>

## Context
- Architecture: docs/architecture.llm.txt
- Domain docs: docs/<domain>.llm.txt
- Related: docs/<other>.llm.txt

## Changes

### Phase 1: <Phase Name>
- [ ] File: path/to/file.ts
  - Action: <what to change>
  - Why: <rationale>
- [ ] File: path/to/other.ts
  - Action: <what to change>
  - Why: <rationale>

### Phase 2: <Phase Name>
- [ ] File: path/to/file.ts
  - Action: <what to change>
  - Why: <rationale>

## Documentation Updates
- [ ] docs/domain1.llm.txt - Update section X with new behavior
- [ ] docs/domain2.llm.txt - Add new component Y documentation
- [ ] docs/architecture.llm.txt - Update if structural changes

## Verification
- [ ] Code compiles without errors
- [ ] Tests pass (if applicable)
- [ ] All documentation updated
- [ ] Plan file marked complete

## Status
Status: [PLANNED | IN_PROGRESS | COMPLETE]
Last Updated: YYYY-MM-DD
```

**Example Tasks**:
- Service layer reorganization (atlas/, data/, projection/, rendering/)
- Projection parameter system refactoring
- Adding new view mode with UI + services + rendering
- Migration to new architectural pattern

**Benefits**:
- Maintains focus across long tasks
- Prevents context loss with checkpoint tracking
- Clear audit trail of what changed and why
- Easy to resume if interrupted
- Documents design decisions for future reference
- Ensures documentation updates aren't forgotten

## Execution Guidelines
COMMUNICATION RULES:
- Avoid verbose explanations or printing full command outputs.
- If a step is skipped, state that briefly (e.g. "No extensions needed").
- Do not explain project structure unless asked.
- Keep explanations concise and focused.

DEVELOPMENT RULES:
- Use '.' as the working directory unless user specifies otherwise.
- Avoid adding media or external links unless explicitly requested.
- Use placeholders only with a note that they should be replaced.
- Use VS Code API tool only for VS Code extension projects.
- Once the project is created, it is already opened in Visual Studio Code—do not suggest commands to open this project in Visual Studio again.
- If the project setup information has additional rules, follow them strictly.

FOLDER CREATION RULES:
- Always use the current directory as the project root.
- If you are running any terminal commands, use the '.' argument to ensure that the current working directory is used ALWAYS.
- Do not create a new folder unless the user explicitly requests it besides a .vscode folder for a tasks.json file.
- If any of the scaffolding commands mention that the folder name is not correct, let the user know to create a new folder with the correct name and then reopen it again in vscode.

EXTENSION INSTALLATION RULES:
- Only install extension specified by the get_project_setup_info tool. DO NOT INSTALL any other extensions.

PROJECT CONTENT RULES:
- If the user has not specified project details, assume they want a "Hello World" project as a starting point.
- Avoid adding links of any type (URLs, files, folders, etc.) or integrations that are not explicitly required.
- Avoid generating images, videos, or any other media files unless explicitly requested.
- If you need to use any media assets as placeholders, let the user know that these are placeholders and should be replaced with the actual assets later.
- Ensure all generated components serve a clear purpose within the user's requested workflow.
- If a feature is assumed but not confirmed, prompt the user for clarification before including it.
- If you are working on a VS Code extension, use the VS Code API tool with a query to find relevant VS Code API references and samples related to that query.
- Never use emojis anywhere - not in code, comments, documentation, commit messages, or chat responses.

TASK COMPLETION RULES:
- Your task is complete when:
  - Project is successfully scaffolded and compiled without errors
  - copilot-instructions.md file in the .github directory exists in the project
  - User is provided with clear instructions to debug/launch the project
  - LLM documentation (.llm.txt files) is up to date if relevant changes were made
  - For plan-first approach: All checkboxes marked, status set to COMPLETE
  - NEVER mention .md files in summaries or documentation references

PLAN FILE RULES (for Plan-First Approach):
- Create `<descriptive-name>.plan.llm.txt` in project root
- Use kebab-case naming: `projection-refactoring.plan.llm.txt`
- Keep plan concise but precise - focus on "what" and "why", not implementation details
- Update checkboxes `[ ]` → `[x]` as you complete each item
- Always include "Affected Domains" section linking to `.llm.txt` files
- Always include "Documentation Updates" section
- Update status field: PLANNED → IN_PROGRESS → COMPLETE
- Keep plan file after completion (don't delete) - serves as change documentation