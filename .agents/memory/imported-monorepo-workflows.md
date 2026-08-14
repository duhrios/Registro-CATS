---
name: Imported monorepo workflows
description: Environment-specific workflow behavior for imported pnpm monorepos with multiple Replit artifacts.
---

The root `.replit` workflows are the reliable preview contract for this imported app: frontend on port 5000 and API on port 8080. Artifact import may also create managed artifact workflows on additional ports; those can be useful for artifact previews but should not replace or duplicate the root service workflows.

**Why:** Re-import/setup automation can add extra port declarations and duplicate frontend/API processes, causing conflicts or task validation drift even while the official app workflows are healthy.

**How to apply:** Keep the root workflow definitions and ports stable. If artifact-managed workflows appear, validate the root services separately and avoid changing application code to accommodate their generated ports.

Imported workspace changes may be checkpointed directly into `HEAD`; `git status`
can therefore show only workspace configuration changes even when the latest
application code is already saved. Inspect `git log` and file contents before
assuming an edit was lost.

**Why:** The Replit import/checkpoint flow can save the working tree before a
later validation pass, which makes a normal diff an unreliable progress log.

**How to apply:** Use the current files and recent commit history as the source
of truth; do not reapply an already-present patch just because `git status` is
clean.