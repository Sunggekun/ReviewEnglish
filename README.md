# ReviewEnglish — vocabulary (local-first)

English vocabulary list stored in **browser local storage**. Adding a word fetches IPA from [Free Dictionary API](https://dictionaryapi.dev/), Chinese meaning from MyMemory Translate (daily limits apply), and **Pronounce** uses the browser’s **Web Speech API**.

Optional **Google sign-in** syncs your vocabulary across devices via Firebase Auth + Firestore. The app remains fully usable without signing in.

## Prerequisites

- Node.js and npm.
- A Firebase project with Google sign-in and Firestore (see [Firebase setup](#firebase-setup) below).

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

## Firebase setup

1. In [Firebase Console](https://console.firebase.google.com/), create or open your project.
2. **Authentication → Sign-in method → Google** — enable and set a support email.
3. **Firestore Database** — create a database (production mode is fine).
4. **Firestore rules** — allow each signed-in user to read/write only their own data:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/data/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

5. **Authentication → Settings → Authorized domains** — ensure `localhost` and your deploy host are listed.
6. Copy `.env.example` to `.env.local` and fill in the web app config from Firebase **Project settings → Your apps**:

```bash
cp .env.example .env.local
```

Required keys: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.

Restart `npm run dev` after changing env vars.

**Note:** Google sign-in requires `http://localhost` or HTTPS hosting. The `npm run build:file` / `file://` bundle does **not** support Firebase auth.

## Behavior

| Feature | Implementation |
|---------|----------------|
| Light / dark | Blueprint [`bp6-dark`](https://blueprintjs.com/docs/#core/typography.dark-theme) + `data-bp-color-scheme` on `<html>`; **Light**, **Dark**, or **System** (OS); preference in `localStorage` |
| Add / remove words | Form + Remove per row |
| Cloud sync | Optional Google sign-in (Preferences → Account); Firestore doc at `users/{uid}/data/vocabulary` |
| Translate to Chinese | MyMemory (`en → zh-TW`, Traditional Taiwan) |
| IPA / phonics | First IPA string from dictionary API; editable as “phonics” |
| Pronunciation | `speechSynthesis` (accent: American or British) |

Duplicate words (same spelling, ignoring case) are rejected when adding.

When signed in, edits sync across devices (per-item merge by `updatedAt`; deletes use tombstones). When signed out, data stays local only.

## Notes

- MyMemory and dictionary calls require network access from your browser.
- If automatic translation or IPA fails, a banner explains it; edit the row manually.
- Clearing site storage removes your local vocabulary cache; cloud data remains if you were signed in.

### Troubleshooting sign-in

**`auth/configuration-not-found`** — Firebase Authentication is not set up for this project yet:

1. Open [Firebase Console → Authentication](https://console.firebase.google.com/project/englishreview-93453/authentication/providers) for your project.
2. Click **Get started** if you see the setup screen.
3. Open **Sign-in method** → **Google** → **Enable**, choose a support email, and save.
4. Under **Settings → Authorized domains**, ensure `localhost` is listed for local dev.
5. Restart `npm run dev` after editing `.env.local`.

Google sign-in uses a **full-page redirect** (not a popup) to avoid Cross-Origin-Opener-Policy issues in modern browsers.

**Data not syncing / `ERR_BLOCKED_BY_CLIENT` on Firestore** — usually an ad blocker blocking Firestore’s long-polling transport. This app uses **Firestore Lite** (plain HTTP) to avoid that. If sync still fails:

1. **Firestore rules** — default production rules deny all writes. Apply the rules in [Firebase setup](#firebase-setup) above.
2. **Ad blockers** — disable for `localhost` or allow `firestore.googleapis.com`.
3. **Preferences → Account** — check the red **Sync error** callout.

Cross-device updates poll every ~30 seconds (and when you refocus the tab), not instantly.

Vite **4.x** is pinned for compatibility across Windows environments where newer Rollup optional native bindings sometimes fail during `npm install`.
