---
name: design-review
description: Use when the user asks for /design-review, design review, UI review, or after modifying .tsx/.css UI files. Validate changed UI against this project design system and report CRITICAL/HIGH/MEDIUM findings before approval.
---

# Design Review

Review modified UI files for design-system compliance and obvious UX defects.

## Workflow

1. Find staged and unstaged UI changes with `git diff --name-only` and `git diff --staged --name-only`.
2. Review `.tsx` and `.css` files under UI areas such as pages, widgets, features, and shared UI.
3. Read applicable design references when present:
   - `DESIGN.md`
   - `rules/common/design-system.md` or `.claude/rules/common/design-system.md`
   - `rules/common/ui-components.md` or `.claude/rules/common/ui-components.md`
   - theme CSS files that define actual tokens.
4. Check:
   - token use instead of hardcoded theme-breaking values
   - layout, spacing, responsive behavior, text overflow, and overlap
   - accessibility and keyboard/focus affordances
   - consistency with existing component patterns
   - obvious visual regressions from screenshots if available
5. Report findings by CRITICAL/HIGH/MEDIUM/LOW and give a verdict:
   - Approve: no CRITICAL/HIGH issues
   - Warn: only MEDIUM/LOW issues
   - Block: any CRITICAL issue

When the UI is compliant but visually flat, use `glass-refine`.
