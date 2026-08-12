---
name: Imported monorepo workflows
description: Environment-specific workflow behavior for imported pnpm monorepos with multiple Replit artifacts.
---

The root `.replit` workflows are the reliable preview contract for this imported app: frontend on port 5000 and API on port 8080. Artifact import may also create managed artifact workflows on additional ports; those can be useful for artifact previews but should not replace or duplicate the root service workflows.

**Why:** Re-import/setup automation can add extra port declarations and duplicate frontend/API processes, causing conflicts or task validation drift even while the official app workflows are healthy.

**How to apply:** Keep the root workflow definitions and ports stable. If artifact-managed workflows appear, validate the root services separately and avoid changing application code to accommodate their generated ports.