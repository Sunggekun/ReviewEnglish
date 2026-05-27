# ReviewEnglish — vocabulary (local-first)

English vocabulary list stored in **browser local storage**. Adding a word fetches IPA from [Free Dictionary API](https://dictionaryapi.dev/), Chinese meaning from MyMemory Translate (daily limits apply), and **Pronounce** uses the browser’s **Web Speech API**.

## Prerequisites

- Node.js and npm.

Install uses `.npmrc` with **`legacy-peer-deps=true`** so Blueprint (React 18 peer) works with React 19.

UI is **[Blueprint 6](https://blueprintjs.com/)** (`@blueprintjs/core`, `@blueprintjs/icons`).

## Scripts

```bash
npm install
npm run dev
```

Open the URL printed in the terminal (usually `http://localhost:5173`).

```bash
npm run build       # production build to dist/ (ES modules, for hosting)
npm run build:file  # single classic <script defer> bundle (open dist/index.html via file://)
npm run lint
```

## Behavior

| Feature | Implementation |
|---------|----------------|
| Light / dark | Blueprint [`bp6-dark`](https://blueprintjs.com/docs/#core/typography.dark-theme) + `data-bp-color-scheme` on `<html>`; **Light**, **Dark**, or **System** (OS); preference in `localStorage` |
| Add / remove words | Form + Remove per row |
| Translate to Chinese | MyMemory (`en → zh-TW`, Traditional Taiwan) |
| IPA / phonics | First IPA string from dictionary API; editable as “phonics” |
| Pronunciation | `speechSynthesis` (accent: American or British) |

Duplicate words (same spelling, ignoring case) are rejected when adding.

## Notes

- MyMemory and dictionary calls require network access from your browser.
- If automatic translation or IPA fails, a banner explains it; edit the row manually.
- Clearing site storage removes your vocabulary list.

Vite **4.x** is pinned for compatibility across Windows environments where newer Rollup optional native bindings sometimes fail during `npm install`.
