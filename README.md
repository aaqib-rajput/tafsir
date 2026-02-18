# Tafsir Session Manager (Full-Stack Next.js)

یہ ایپ اب **Next.js + API Routes** پر چلتی ہے اور Vercel free plan کے مطابق deploy کی جا سکتی ہے۔

## Features

- Attendance + speaker timer with persistent members
- Drag-and-drop reorder in attendance list
- Drag member into speaker window to select instantly
- Speaker timer starts at `00:00` until someone is selected
- CSV export for valid members only (blank/`none` excluded)
- Responsive UI for mobile + desktop

## Data storage (Vercel-friendly)

### Recommended (Production): Vercel KV

1. Vercel project میں **KV** add کریں (free tier available).
2. یہ env vars خود add ہو جائیں گے:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
3. Deploy کریں — data persistent رہے گا۔

### Local fallback

اگر KV env vars موجود نہ ہوں تو app `.data/members.json` میں data لکھتی ہے (local/dev mode fallback).

## Run locally

```bash
npm install
npm run dev
```

Open: <http://localhost:3000>

## Build check

```bash
npm run lint
npm run build
```
