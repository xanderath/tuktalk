# KamJai / TukTalk Handover (for Claude)

## 1) Scope and root path
- Active app root: `/Users/alexanderathienitis/Documents/New project/tuktalk_work`
- Stack: Expo + React Native Web + Supabase
- App codename in package: `kamjai`

This handover is for the `tuktalk_work` app folder, not the separate `readchest` monorepo in `/Users/alexanderathienitis/Documents/New project`.

## 2) Current build status
- TypeScript status: `npx tsc --noEmit` passes.
- Story + Arcade tabs: loading fallback added to prevent infinite spinner on profile load failure.
- Dev-only unlock action exists in Settings (`__DEV__` only), unlocks all 30 levels for current account.

## 3) High-level architecture

### Core gameplay engine
- `/src/minigames/core/MiniGameEngine.ts`
- `/src/minigames/core/types.ts`
- `/src/minigames/core/intentMatching.ts`
- `/src/minigames/core/vocabLoader.ts`
- `/src/minigames/core/definitionLoader.ts`
- `/src/minigames/core/playerProgress.ts`

### Input adapters
- `/src/minigames/input/TapInputAdapter.ts`
- `/src/minigames/input/VoiceInputAdapter.ts`

### Mechanics
- `/src/minigames/mechanics/RunnerMechanic.tsx`
- `/src/minigames/mechanics/SortMatchMechanic.tsx`
- `/src/minigames/mechanics/RhythmMechanic.tsx`
- `/src/minigames/mechanics/CraftSequenceMechanic.tsx`
- `/src/minigames/mechanics/DialogueTilesMechanic.tsx`
- Shared mechanic renderer: `/src/minigames/mechanics/CommonMechanicView.tsx`

### Level definitions (30)
- `/src/minigames/levels/level01_airport.ts` … `/src/minigames/levels/level30_friends.ts`
- Registry and game titles: `/src/minigames/levels/index.ts`

### Primary screens
- `/src/screens/StoryModeScreen.tsx`
- `/src/screens/ArcadeHubScreen.tsx`
- `/src/screens/MiniGameScreen.tsx`
- `/src/screens/SettingsScreen.tsx`
- Legacy + supporting screens still present (`Home`, `Level`, `Review`, `Glossary`, `Profile`, etc.)

### Navigation/state contexts
- `/src/navigation/Tabs.tsx`
- `/src/context/TabContext.tsx`
- `/src/context/ThemeContext.tsx`
- `/src/context/SessionStatsContext.tsx`

## 4) Supabase schema and migrations

Migrations are under:
- `/supabase/migrations`

Notable newer migrations:
- `20260205142000_add_fk_indexes.sql` (FK indexes performance pass)
- `20260205143000_dialogues_table_seed.sql` (dialogues table + seed path)
- `20260205150000_dialogues_admin_policies.sql` (dialogue admin access rules)
- `20260206153000_dialogues_admin_role.sql` (admin role work)
- `20260206160000_user_pronunciations.sql` (user pronunciation captures)
- `20260206173000_user_profile_progression.sql` (`user_profile` tokens/unlocks/settings)

## 5) Dialogues and content source of truth
- App now treats dialogue content as DB-backed.
- Shared dialogue interfaces only:
  - `/src/lib/dialogues.ts`
- Dialogue admin data helpers:
  - `/src/lib/dialogueAdmin.ts`

## 6) Pronunciation feature
- Pronunciation utility:
  - `/src/lib/pronunciation.ts`
- Transliteration utility:
  - `/src/lib/transliteration.ts`
- Listen & Learn includes practice flow and user-audio capture path.

## 7) Theme system
- Theme/tokens:
  - `/src/lib/themes.ts`
  - `/src/lib/tokens.ts`
- Supports light/day and neon/night theme behavior via `ThemeContext`.

## 8) Run instructions (fresh machine)
1. `cd "/Users/alexanderathienitis/Documents/New project/tuktalk_work"`
2. `npm install`
3. Ensure `.env` contains required public vars:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - optional existing keys used by app (Stripe/PostHog/Google)
4. `npx supabase db push`
5. `npm run web`

Recommended clean web start:
- `npm run web -c`

## 9) Verification checklist
1. Open app and sign in.
2. Story tab loads level cards.
3. Arcade tab loads replay list.
4. Start a level and confirm:
   - Thai + romanization render
   - tap actions progress prompts
   - voice mode (if browser supports) maps to intent
5. Settings in dev mode:
   - `Unlock All Content` visible and functional
   - hidden in production builds

## 10) Known gaps / next technical priorities
- Mechanics are currently configured variants on shared runtime UI; bespoke per-level game logic depth can be expanded.
- Formal tests still needed for:
  - intent matching normalization and fuzzy thresholds
  - mic denied/fallback behavior
  - unlock progression + arcade replay behavior
- Expo warnings still present for deprecated `expo-av` path and some web-specific warnings.
- Dialogue admin UI is not fully built out (helpers exist).

## 11) Collaboration guidance for Claude
- Keep DB as source of truth for content.
- Preserve bilingual display contract:
  - Thai script primary
  - romanization secondary
  - English optionally hidden via settings
- Avoid reintroducing local dialogue fallback logic.
- Avoid random option reshuffling during answer feedback (preserve stable option order per question instance).

## 12) Git/worktree note
- Worktree is intentionally dirty with many uncommitted files and migrations.
- Do not reset or drop local changes; continue incrementally.
