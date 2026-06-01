# AI Coding Agent Guide - Context Files

This directory contains context files that help AI coding agents understand the Persoulna codebase without reading every file. Use these as a starting point before making changes.

## Context File Index

| File | What it Covers | Read When... |
|------|---------------|--------------|
| `context/project_overview.md` | High-level description, tech stack, architecture, workflow | First time working on the project or needing a refresher |
| `context/database_schema.md` | All Prisma models, fields, relations, constraints | Adding/removing/modifying database models, queries that touch specific fields |
| `context/api_and_routes.md` | All server actions, API routes, readiness blockers | Modifying server actions, adding new features, changing the dashboard |
| `context/data_flow.md` | Native Gemini, Postiz, local vault pipeline, styling | Working with AI generation, Postiz, X API, understanding end-to-end flow |
| `context/constants_reference.md` | All status enums, numeric constants, blocker keys | Adding new status values, changing constants, referencing enums |
| `context/styling_guide.md` | CSS design tokens, layout classes, visual patterns | Modifying UI components, adding new pages/sections, styling changes |
| `context/design.json` | Design specification data | Understanding design requirements (if present) |
| `context/project_spec.md` | Original implementation plan | Understanding original requirements and acceptance criteria |

## Required Workflow for AI Agents

### Before Making Any Changes
1. Read `context/project_overview.md` for high-level understanding
2. Read the specific context file(s) relevant to your task
3. Search/read the actual source files you need to modify

### After Making Changes
**You MUST update the relevant context files** when you:
- Add/modify/remove a **database model** -> update `context/database_schema.md`
- Add/modify/remove a **server action or API route** -> update `context/api_and_routes.md`
- Add/modify/remove a **library module** (src/lib/*) -> update `context/data_flow.md`
- Add/modify/remove a **constant or enum** -> update `context/constants_reference.md`
- Add/modify/remove **CSS or UI component** -> update `context/styling_guide.md`
- Change the **tech stack, architecture, or workflow** -> update `context/project_overview.md`
- Change the **project spec or requirements** -> update `context/project_spec.md`

### Context File Update Rules
- Keep context files **concise and accurate** - remove outdated info
- Update **immediately after** making changes, not as a separate step
- If a file becomes too large, split it into focused sub-files
- If you add a new context file, add it to the index table in this file
- Use the same structure and format as existing files for consistency

### When to Skip Context Updates
- Whitespace or formatting changes
- Renaming internal variables (unless the name change affects the public API)
- Adding comments or documentation that doesn't change behavior
