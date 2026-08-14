---
name: Imported workspace setup
description: Environment-specific setup lessons for imported pnpm monorepos with separate frontend and API workflows.
---

Imported monorepos can have a complete lockfile but no installed `node_modules`,
so workflow failures such as missing Vite or esbuild should be treated as an
environment setup issue first. Some Vite configurations also require runtime
variables during a full workspace build even when they are not needed by the
static output.

**Why:** Debugging application code before restoring the declared dependencies
and build environment creates misleading failures and unnecessary edits.

**How to apply:** Run the project's frozen pnpm install first, then use the
workflow's required `PORT`/base-path variables for validation builds. Keep
frontend and API workflows separate when the imported project already defines
them.