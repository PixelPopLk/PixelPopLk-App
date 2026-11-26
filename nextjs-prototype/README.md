# PixelPop Next.js Prototype

This is an isolated Next.js prototype inside the existing PixelPopLK repository. It does not replace or modify the original application.

## Stack
- Next.js App Router + TypeScript
- React
- Plain CSS (mobile-first responsive layout)
- Static export for Cloudflare Pages

## Run locally
From this directory:

```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

The static site is generated in `out/`.

## Cloudflare Pages
Create a separate Pages project connected to this repository and configure:
- Root directory: `nextjs-prototype`
- Build command: `npm run build`
- Build output directory: `out`

This prototype uses static export. Server-side rendering, Next.js API routes, and server actions are not available in this deployment mode. Live subtitle search, authentication, and downloads will be connected to Supabase in a later phase.

## Important
The displayed subtitle entries are demo data, not real downloadable subtitle files. The existing app remains untouched on the original branch.
