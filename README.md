# Tafsir Session Manager (Next.js Full-Stack)

This app is now full-stack with API routes and persistent storage.

## What storage is supported now?

The backend chooses storage in this order:

1. **Supabase Postgres** (recommended from your screenshot setup)
2. **Vercel KV** (optional fallback)
3. **Local file** (`.data/members.json`) for local development only

---

## 1) Connect Supabase (Recommended)

Since you already added a Supabase project (`supabase-tafsir`), follow these exact steps.

### A. Add environment variables in Vercel

In **Vercel → Project → Settings → Environment Variables**, add:

- `SUPABASE_URL`
  - Example: `https://xxxx.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`
  - From Supabase project settings (API keys)

> Use **Service Role Key** on server-side only. Do **not** expose it in client code.

### B. Create table in Supabase SQL editor

Run this SQL in Supabase:

```sql
create table if not exists public.members (
  id text primary key,
  name text not null,
  role text not null default 'participant',
  attendance text not null default 'unmarked',
  speak_limit integer not null default 120,
  elapsed_time integer not null default 0,
  queue_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists members_queue_order_idx on public.members(queue_order);
```

### C. RLS policy options

You have 2 options:

- **Option 1 (simplest for now):** Disable RLS for `members` table.
- **Option 2 (recommended security):** Keep RLS enabled and only allow server-side access with service role key (this app already uses server API routes).

If you want, I can provide strict RLS policies in the next update.

### D. Redeploy

After adding env vars and table, redeploy in Vercel.

---

## 2) Vercel KV (Optional)

If Supabase env vars are missing, app can still use KV if these exist:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

No additional code changes needed.

---

## 3) Blob Store / Edge Config from your screenshot

You also created:

- `tafsir_storage` (Blob)
- `tafsir` (Edge Config)

These are **not required** for current member/attendance database logic.

- Use **Blob** when you want to store files (exports, documents, media).
- Use **Edge Config** for small feature flags/settings (not relational member data).

If you want, I can wire:
- CSV upload/download history to Blob
- role/timer runtime settings to Edge Config

---

## Local development

```bash
npm install
npm run dev
```

Open: <http://localhost:3000>

If no cloud env vars are set locally, data is saved in `.data/members.json`.

---

## Backend/API used by frontend

- `GET /api/members` → load members
- `POST /api/members` → create member
- `PUT /api/members` → replace/sync members
- `DELETE /api/members?id=...` → delete member

---

## What I need from you (to finalize production DB setup)

Please share/confirm these (you can mask secrets):

1. `SUPABASE_URL` added in Vercel
2. `SUPABASE_SERVICE_ROLE_KEY` added in Vercel
3. `members` table created with the SQL above
4. Whether RLS is enabled or disabled

Once you confirm, I can provide a final hardening pass (RLS-safe queries + migration scripts + backup strategy).
