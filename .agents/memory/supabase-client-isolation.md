---
name: Supabase client isolation
description: Prevent authentication sessions from contaminating service-role database queries in the API.
---

Supabase Auth calls that create or restore a user session can mutate the
client's session state. If that client is also used for service-role
PostgREST queries, later profile lookups may run with the user's JWT instead
of the service-role key and RLS can make an existing profile appear missing.

**Why:** The first login/bootstrap request can succeed while the immediate
permission lookup returns a false 403, hiding administrator-only UI.

**How to apply:** Keep a dedicated service-role client for database/admin
operations and create an isolated anon-key auth client for password sign-in.
Validate the complete sequence: login 200, `/api/auth/me` 200, and expected
role.