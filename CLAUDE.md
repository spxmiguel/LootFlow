# LootFlow — CLAUDE.md

> Project context for AI assistants. Keeps sessions aligned without hitting context limits.

## Working Directory

**Active project**: `/Users/miguelramthunmoretti/Downloads/LootFlow-main 2`
- `LootFlow-main` = identical copy (same files, no diff)
- `/Downloads/lootflow/` = Electron distribution output (built artifacts + `operator/` subproject)
- Remote: `spxmiguel/LootFlow`

## What This Is

Open-source CS2 drop analytics tool. Tracks weekly Prime drops, calculates ROI/payback vs Prime cost, syncs to Firebase. Runs as **Electron desktop app** + PWA (GitHub Pages). Privacy-first: all writes gated by `AppSettings.firebaseSyncEnabled`.

## Stack

| Layer | Tech |
|---|---|
| UI | React 18 + TypeScript + Vite + TailwindCSS |
| Animation | Framer Motion |
| Charts | Recharts |
| State | Zustand (`subscribeWithSelector`) |
| Backend | Firebase Auth + Firestore |
| Desktop | Electron (vite-plugin-electron + electron-builder) |
| Export | xlsx (SheetJS) |
| i18n | Custom (`src/lib/i18n.ts`) — pt (default) + en |

## Hard Constraints — Never Break These

### PRIME_COST_BRL = 74.99
- **ALWAYS** use `PRIME_COST_BRL` from `src/lib/config.ts` for all cost calculations and exports.
- **NEVER** use `account.cost` — accounts don't have individual costs.
- This was explicitly corrected; violating it breaks ROI/payback across all accounts.

### Currency
- Always BRL internally. `settings.usdRate` is only for optional USD display.
- Steam prices fetched in R$ via CORS proxies (proxies are US-based → Steam returns USD → must detect symbol and convert with FX rates).

### Drop rules
- Max 2 drops/account/week.
- Tuesday reset. `weekId` format: `YYYY-MM-DD` of that Tuesday.
- These drive `calcWeekStats` and goal progress — don't change the format.

## File Map

```
src/
  App.tsx                    # Router (Page enum → component), modal system
  store/index.ts             # Zustand store — all state + actions
  lib/
    types.ts                 # CSAccount, Drop, Goal, AppSettings, AppUser, Page, ModalType, ProfileOverride, SteamSearchResult, FirebaseConfig
    config.ts                # PRIME_COST_BRL and other constants
    calculations.ts          # calcAccountStats, calcWeekStats, calcDashboardStats
    firebase.ts              # initFirebase, firestoreSaveDoc/DeleteDoc/LoadCollection, isFirebaseReady
    steam.ts                 # fetchSteamPrice, fetchSteamProfileAvatar, CORS proxy chain, USD→BRL FX
    export.ts                # exportDrops → xlsx/csv/txt
    storage.ts               # localStorage helpers + DEFAULT_SETTINGS
    deviceAuth.ts            # Electron deep-link auth flow (lootflow:// scheme)
    i18n.ts                  # createT(lang) — pt fallback if key missing in en
    logger.ts                # Thin wrapper, respects settings.debugMode
    utils.ts                 # generateId, getAccountColor, getCurrentWeekId, getWeekLabel, etc.
  hooks/
    useAuth.ts               # Auth state machine — Firebase + local mode + Electron deep-link
    useSteamSearch.ts        # Debounced Steam Market search
    useT.ts                  # Returns t() bound to settings.language
  components/
    Layout.tsx               # Sidebar + topbar shell
    ProfileModal.tsx         # Avatar, useProfileDisplay, ProfileModal (exports all three)
    SteamSearch.tsx          # Item search with SteamItemImage
    ui.tsx                   # Shared primitives (Button, Input, Modal, etc.)
    LegalModal.tsx           # LGPD compliance text
    PWAInstallPrompt.tsx     # beforeinstallprompt handler
    ErrorBoundary.tsx
    MarketplaceLinks.tsx
    SteamItemImage.tsx
  pages/
    Dashboard.tsx            # KPI cards + area/bar charts (last 8 weeks)
    Accounts.tsx             # Account CRUD + per-account stats
    Drops.tsx                # Drop log — add/edit/delete/sell
    Analytics.tsx            # Extended analytics view
    Goals.tsx                # Goal CRUD + progress tracking
    Settings.tsx             # Theme, language, privacy, Firebase config, export
    AuthPage.tsx             # Login UI — Firebase Google + local mode
  types/
    electron.d.ts            # window.electronAPI typings
electron/
  main.ts                    # Electron main process — deep-link, BrowserWindow
  preload.ts                 # contextBridge → window.electronAPI
```

## Auth Architecture

Two modes — `authMode: 'firebase' | 'local'`:

### Firebase (Google Sign-In)
- **Web**: `signInWithPopup` (desktop browsers) or `signInWithRedirect` (mobile).
- **Electron**: opens system browser → `lootflow://` deep-link callback → IPC → `window.electronAPI.onAuthCredential`.
- `authListenerStarted` module-level flag prevents duplicate `onAuthStateChanged` listeners on HMR.
- `redirectHandled` / `clearRedirectPending()` prevent double-hydration after redirect.
- **`auth/internal-error` from signInWithPopup** = domain not authorized in Firebase Console → Authentication → Settings → Authorized domains. Add `localhost` for dev.
- **Headless/preview browsers CANNOT test Google OAuth** — always throws `auth/internal-error`. Test auth manually.

### Local mode
- No Firebase needed. Data stays in localStorage only.
- Session persisted in `lootflow_session` localStorage (30-day TTL).

## Firebase Setup
- **Active project**: `lootflow-92afd` (Firestore: southamerica-east1 / São Paulo)
- authDomain: `lootflow-92afd.firebaseapp.com`
- **Old project**: `kkkkkkkk-3fc45` — mantido, não deletar (dados antigos lá)
- Config em `src/lib/config.ts` (hardcoded) + `.env.production` (ambos devem estar sincronizados)
- Firestore rules em `firestore.rules` — deploy: `firebase deploy --only firestore:rules --project lootflow-92afd`
- `AppSettings.firebaseSyncEnabled` gates ALL Firestore writes.
- Authorized domains: localhost, lootflow-92afd.firebaseapp.com, lootflow-92afd.web.app, spxmiguel.github.io

## Steam API
- `STEAM_APP_ID = 730` (CS2)
- Three CORS proxies tried in order: `corsproxy.io` → `allorigins.win` → `codetabs.com`
- Proxies are US-hosted → Steam ignores `?currency=7` → returns USD → must detect currency symbol and convert.
- `lootflow_steam_v2` cache key (v2 invalidates old USD-wrong cache), 30min TTL
- FX rates: `lootflow_fx_v2`, 6h TTL, fetched from exchangerate API
- `fetchSteamProfileAvatar(steamId)` — auto-fetches avatar for new accounts

## Settings Inversions (UI vs Code)
- `settings.theme.animations = false` → performance mode → shown in UI as **"Otimizar site"** toggle (semantically inverted — checked = animations OFF)
- `settings.currency` drives display only; internals always BRL

## i18n
- `createT('pt' | 'en')` → returns `t(key, vars?)` function
- Missing EN key → falls back to PT silently
- All UI text goes through `useT()` hook

## Export
- `exportDrops(drops, accounts, settings, opts)` → handles xlsx/csv/txt
- xlsx has two sheets: Drops + Accounts
- Cost column uses `PRIME_COST_BRL` (never account.cost)
- USD export: converts with `opts.usdRate ?? settings.usdRate ?? 5.2`

## Dev Commands
```bash
npm run dev              # Vite dev server (web only)
npm run electron:dev     # Build + launch Electron
npm run electron:build   # Build distributable (current platform)
npm run electron:build:mac  # .pkg for macOS
npm run electron:build:win  # NSIS installer for Windows
npm run build            # Web-only build (for GitHub Pages)
```

## Deploy
- GitHub Actions: `.github/workflows/deploy.yml` (GitHub Pages) + `release.yml` (Electron builds)
- `vite.config.ts` sets `base: './'` for Electron relative asset paths
- Electron entry: `app/index.html` (not root `index.html`)

## Selective Data Delete (Privacy / LGPD)
Store actions: `clearDrops`, `clearAccounts`, `clearGoals`, `resetSettingsToDefault`
Full account delete: `useAuth.deleteAccount()` → wipes all Firestore + localStorage

## Common Pitfalls
1. **Never use `account.cost`** — always `PRIME_COST_BRL`
2. **Steam prices come back as USD** when proxied from US servers — conversion is required
3. **Don't add `authListenerStarted = false` resets** — causes duplicate Firebase listeners on HMR
4. **OAuth popup fails in headless browsers** — test auth only in real browser
5. **`weekId` must be ISO date of Tuesday** — changing format breaks historical data
6. **`vite.config.ts base: './'`** is required for Electron — don't change to absolute path
