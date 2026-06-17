# LootFlow 2.0

The ultimate CS2 Prime Drop tracker, collection manager, progression system and social hub.

LootFlow helps CS2 Prime farmers track weekly drops, cashout, ROI, goals, case openings, collection discovery, and social progress across one or many accounts.

## Features

- Multi-account CS2 Prime drop tracking with weekly limits.
- Steam Market item search with cached pricing.
- Cashout, ROI, payback, and goal progress calculations.
- Discovery-based collection system with locked and unlocked item states.
- Perfect Weeks, XP, levels, titles, and 357 achievements.
- Case opening tracker with historical case/key/item values.
- Friends, friend requests, friends-only rankings, and public-profile foundation.
- Lite Mode for a quiet tracking-only experience.
- Privacy controls for profile, statistics, collection, achievements, profit, accounts, and history.
- Local-only mode through `localStorage`, plus optional Google/Firebase sync.

## Dashboard

The dashboard summarizes current-week progress, total cashout, net balance, ROI, closest goals, account performance, recent feed activity, insights, achievements, and the activity heatmap.

Timeline is not a standalone page in LootFlow 2.0. Account, drop, sale, goal, payback, and activity events belong in the existing feed and related pages.

## Collection System

The collection is built only from the user's own discovered items.

- Registering a drop unlocks or updates that item in the collection.
- Opening a case unlocks or updates the received item.
- Discovered cards show image, name, count, first seen, last seen, and highest value seen.
- Locked cards are generic placeholders and do not require maintaining a fixed CS2 drop pool.

## Perfect Weeks

A perfect week is reached when every active account has its weekly drops registered for that week. LootFlow tracks:

- Total perfect weeks.
- Current perfect-week streak.
- Best perfect-week streak.

Unknown-date drops do not count toward weekly limits or perfect-week completion.

## XP & Levels

XP rewards weekly efficiency instead of raw account count:

- 100 percent completion: 100 XP.
- 90 percent or higher: 80 XP.
- 80 percent or higher: 60 XP.
- 70 percent or higher: 40 XP.
- Below 70 percent with progress: 20 XP.

Level is calculated with:

```ts
level = Math.floor(totalXP / 500) + 1
```

## Titles

Titles are unlocked from user activity, including:

- One Account One Dream
- Valve Employee
- Case Farmer
- Lucky Bastard
- Collector
- Sunday Night Gang
- Drop Addict

Users can select an unlocked active title.

## Friends

The friends foundation includes:

- Friend code display.
- Add friend by code.
- Friend requests.
- Accept and decline requests.
- Remove friend.

No chat is included.

## Rankings

Rankings are friends-only first and disabled by default for local/offline users. Ranking data is structured around:

- XP
- Level
- Drops
- Efficiency
- Perfect weeks
- Streak
- Profit

## Public Profiles

Public profiles are prepared at:

```txt
/u/:username
```

Profiles never show email. They only show data allowed by the user's privacy settings, such as avatar, display name, join date, title, level, XP, total drops, profit, perfect weeks, goal progress, collection progress, cases opened, and opening ROI.

## Goal Tracking

Goals support cashout, revenue, profit, and drop targets. Dashboard and Goals views show progress, remaining amount, and active goals.

## Case Opening Tracker

Case opening is launched from the Drops page for drops detected as cases. Each opening stores historical values:

- `casePriceAtOpen`
- `keyPriceAtOpen`
- `receivedValueAtOpen`
- `openedAt`
- `profitLoss`

Old openings are never recalculated with current prices.

## Lite Mode

Lite Mode hides gamified/social systems without deleting data:

- XP
- Levels
- Titles
- Achievements
- Perfect Weeks
- Streaks
- Collection
- Friends
- Rankings
- Public Profiles
- Case Opening Analytics

## Privacy

LootFlow supports local/offline use and optional Firebase sync. Local/offline mode keeps online/social features disabled by default.

Privacy controls allow hiding:

- Profile
- Statistics
- Achievements
- Collection
- Total profit
- Accounts
- History

## Tech Stack

- React
- TypeScript
- Vite
- Zustand
- Firebase
- Firestore
- Tailwind CSS
- Framer Motion
- Recharts
- Lucide React
- Electron build support

## Local Development

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:5173
```

Build:

```bash
npm run build
```

Typecheck:

```bash
npx tsc --noEmit
```

## Roadmap

- Real Firestore-backed friend search and requests.
- Real friends-only ranking aggregation.
- Username reservation for public profiles.
- Profile sharing controls.
- Better case opening analytics.
- More automated regression tests.
