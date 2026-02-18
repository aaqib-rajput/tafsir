# codex

This project is now a **Next.js** app wrapping the existing Tafsir Session Manager UI, ready to deploy on **Vercel**.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Run the Next.js dev server:

```bash
npm run dev
```

3. Open <http://localhost:3000>.

## Production build

```bash
npm run build
npm run start
```

## Deploy to Vercel

### Option 1: Vercel dashboard

1. Push this repository to GitHub.
2. Import the repo in Vercel.
3. Keep the default framework preset (**Next.js**).
4. Click **Deploy**.

### Option 2: Vercel CLI

```bash
npm i -g vercel
vercel
```

For production deployment:

```bash
vercel --prod
```
