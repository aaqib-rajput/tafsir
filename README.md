# Tafsir Session Manager (Next.js Full-Stack)

This app supports persistent storage and auto-selects backend in this order:

1. **Supabase** (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`)
2. **Upstash / Vercel KV REST**
3. Local file fallback (`.data/members.json`) for local dev

---

## Upstash KV on Vercel (your current setup)

You are using **Upstash for Redis (Vercel KV replacement)**, which is perfect.

### Which storage name/prefix should I use?

In the **Connect Project** modal, if possible set **Custom Prefix = `KV`**.

That gives env vars like:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

This is the cleanest option.

### If you already used another prefix (e.g. `STORAGE`)

No problem — current code auto-detects prefixed REST vars too, such as:
- `STORAGE_REST_API_URL`
- `STORAGE_REST_API_TOKEN`

It also supports Upstash default REST names:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

So you can keep your existing prefix.

### Connect steps in Vercel

1. Open Upstash integration and click **Connect Project**.
2. Select environments: Development, Preview, Production.
3. Set prefix:
   - Recommended: `KV`
   - Or keep your custom prefix (works now)
4. Click **Connect**.
5. Redeploy your app.

---

## Supabase (optional primary DB)

If you also configure Supabase env vars, Supabase becomes primary storage.

### Add env vars in Vercel

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Create table in Supabase SQL Editor

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

---

## Local development

```bash
npm install
npm run dev
```

Open: <http://localhost:3000>

If no cloud env vars are set, app stores data in `.data/members.json`.

---

## API endpoints

- `GET /api/members` → load members
- `POST /api/members` → create member
- `PUT /api/members` → sync/replace members
- `DELETE /api/members?id=...` → delete member

---

## What I need from you to verify final setup

Please confirm:

1. Which prefix you selected in Upstash Connect (`KV` or `STORAGE` etc.)
2. That related env vars are visible in Vercel project settings
3. Whether you want **KV-only** mode, or **Supabase primary + KV fallback**

After that, I can do one final cleanup/hardening pass.
