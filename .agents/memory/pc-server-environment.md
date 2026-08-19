---
name: PC-server environment
description: Deployment assumption for the imported application outside Replit.
---

The target deployment is a persistent PC-server, not a Replit-hosted application. Runtime credentials belong in the server service environment or a protected `.env` file, never in source control or frontend code.

**Why:** The API depends on real Supabase and Google Drive credentials, and the local Replit preview may not have those values.

**How to apply:** Preserve the portable start command that loads `.env` when present, while allowing systemd, Windows services, or another process manager to provide environment variables directly.