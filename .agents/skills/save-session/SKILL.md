---
name: save-session
description: Use when the user asks for /save-session, save session, handoff notes, or resumable work context. Capture current work, decisions, failures, file states, validation evidence, blockers, and exact next step into a dated session file.
---

# Save Session

Write a resumable session handoff. Be specific enough that a future session can continue without guessing.

## Workflow

1. Gather context:
   - Modified files from git diff/status.
   - What was discussed, attempted, built, validated, or left undone.
   - Errors encountered and exact resolutions or current blockers.
   - Current test/build status when relevant.
2. Create the session directory:
   - Prefer `~/.codex/session-data`.
   - If preserving legacy Claude compatibility matters, also mention `~/.claude/session-data`.
3. Create `YYYY-MM-DD-<short-id>-session.tmp` using the actual current date.
4. Include every required section. Use `N/A` or an honest empty statement rather than omitting content.
5. Show the saved path and summarize the contents for user confirmation.

## Required Sections

- Session title, time, project, topic
- What We Are Building
- What WORKED with evidence
- What Did NOT Work and why
- What Has NOT Been Tried Yet
- Current State of Files
- Decisions Made
- Blockers & Open Questions
- Exact Next Step
- Environment & Setup Notes, only when relevant
