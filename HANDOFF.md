# HANDOFF.md

## 1) Status Summary

### Currently working
- Expo app boots and compiles (`npx tsc --noEmit` passes in this workspace).
- Auth + tab navigation are present (`Home`, `Review`, `Glossary`, `Profile`, plus Story/Arcade screens).
- Story Mode and Arcade Hub exist and load progression with a fallback path if profile load fails:
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/src/screens/StoryModeScreen.tsx`
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/src/screens/ArcadeHubScreen.tsx`
- Mini-game architecture and 30 level definition modules are present:
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/src/minigames/core/*`
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/src/minigames/mechanics/*`
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/src/minigames/levels/level01_airport.ts` ... `level30_friends.ts`
- Level lesson flow is implemented (`intro`, `video`, `listen`, `quiz`, `match`, `dialogue`, `complete`) in:
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/src/screens/LevelScreen.tsx`
- Pronunciation practice exists in Listen & Learn:
  - push-to-talk speech capture
  - confidence scoring
  - animated listening ring/wave
  - transcript + RTGS transliteration + English hint
  - optional save path for user pronunciation records
- DB-only dialogue loading is implemented in LevelScreen (`dialogues` table query). If no dialogue rows exist for a level, dialogue phase is skipped.
- FK index migration file exists:
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/supabase/migrations/20260205142000_add_fk_indexes.sql`

### Known bugs / incomplete areas
- Visual polish is incomplete versus target reference art (retro tropical/day and neon/night are partial, not fully art-directed end-to-end).
- Dialogue distractor quality still needs a full editorial pass; some options can still feel conversationally plausible.
- Dialogue admin helper library exists, but no full admin UI is wired yet:
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/src/lib/dialogueAdmin.ts`
- Runtime warnings still expected on web/dev:
  - `expo-av` deprecation warning
  - `expo-notifications` web limitation warning
- `npx supabase migration list` could not be verified from this machine due missing Supabase access token.

### What was in progress when paused
- Completing full dialogue quality pass (clearer incorrect options per level).
- Wiring full DB-backed dialogue authoring workflow (helper functions are present; admin screen not yet built).
- Final visual pass to fully match the pixel-art day/night style references.

---

## 2) Full Current Codebase Status

### Repo location
- `/Users/alexanderathienitis/Documents/New project/tuktalk_work`

### Config files check
Present:
- `/Users/alexanderathienitis/Documents/New project/tuktalk_work/app.json`
- `/Users/alexanderathienitis/Documents/New project/tuktalk_work/tsconfig.json`

Not present (at repo root):
- `/Users/alexanderathienitis/Documents/New project/tuktalk_work/app.config.js`
- `/Users/alexanderathienitis/Documents/New project/tuktalk_work/eas.json`
- `/Users/alexanderathienitis/Documents/New project/tuktalk_work/babel.config.js`

### Git state
- Branch: `main`
- Remote: `origin git@github.com:xanderath/tuktalk.git`
- There is a large local working tree with many modified/untracked files (feature work is not fully committed yet).

### ZIP exports already created
- `/Users/alexanderathienitis/Documents/New project/kamjai_tuktalk_work_export_2026-02-06.zip`
- `/Users/alexanderathienitis/Documents/New project/kamjai_tuktalk_work_export_2026-02-06_clean.zip`

---

## 3) Environment Variables

Do not commit secrets. Variables currently expected:

1. `EXPO_PUBLIC_SUPABASE_URL`
- Purpose: Supabase project URL for client connection.
- Used in:
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/src/lib/supabase.ts:4`

2. `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Purpose: Supabase anon key for client-side authenticated/rls access.
- Used in:
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/src/lib/supabase.ts:5`

3. `EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY`
- Purpose: Google TTS API requests.
- Used in:
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/src/lib/audio.ts:3`

4. `EXPO_PUBLIC_POSTHOG_KEY`
- Purpose: PostHog client key.
- Used in:
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/src/lib/analytics.ts:1`

5. `EXPO_PUBLIC_POSTHOG_HOST`
- Purpose: PostHog host endpoint.
- Used in:
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/src/lib/analytics.ts:2`

6. `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Purpose: Stripe client publishable key (future/integration path).
- Current usage: present in `.env`, not currently referenced in app code.

---

## 4) Database State (Supabase)

### Local migration inventory
Current migration files in `/supabase/migrations`:
- `20260203062246_initial_schema.sql`
- `20260204121500_share_events.sql`
- `20260204124500_session_stats.sql`
- `20260204130000_add_incorrect_streak.sql`
- `20260204133000_review_sessions.sql`
- `20260205000000_add_level_vocabulary.sql`
- `20260205021000_seed_level_vocabulary.sql`
- `20260205022000_dialogues.sql`
- `20260205100000_complete_level_content.sql`
- `20260205142000_add_fk_indexes.sql`
- `20260205143000_dialogues_table_seed.sql`
- `20260205150000_dialogues_admin_policies.sql`
- `20260206153000_dialogues_admin_role.sql`
- `20260206160000_user_pronunciations.sql`
- `20260206173000_user_profile_progression.sql`

### Seed data files
- `/Users/alexanderathienitis/Documents/New project/tuktalk_work/supabase/seed/seed_level_vocabulary.sql`

### Schema version note
- Latest local migration timestamp: `20260206173000_user_profile_progression.sql`

### Applied/pending status
- Remote migration status was **not** verified in this environment because `supabase` CLI is not logged in (`SUPABASE_ACCESS_TOKEN` missing).
- Command attempted: `npx supabase migration list`.
- Result: auth error, so unapplied migration status against remote is unknown from this machine.

---

## 5) Dependency Changes

Observed package manifest delta (`git diff -- package.json`):
- App name changed: `tuktalk` -> `kamjai`.
- Added dependencies:
  - `@expo-google-fonts/mitr`
  - `@expo-google-fonts/sarabun`
  - `expo-av`
  - `expo-font`
  - `expo-notifications`

Why:
- Fonts for the updated visual system.
- Audio playback/TTS + pronunciation playback paths.
- Notification support scaffolding.

Notes:
- `expo-av` currently logs a deprecation warning in SDK 54 and should be migrated to `expo-audio` + `expo-video` in a future pass.

---

## 6) Architecture Decisions / Trade-offs

1. Mini-game framework first, level-as-config pattern
- Decision: build shared core engine + mechanic components, then configure per-level definitions.
- Files:
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/src/minigames/core/MiniGameEngine.ts`
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/src/minigames/levels/levelFactory.ts`
- Trade-off: fast 30-level coverage with consistent behavior; some level-specific uniqueness still pending polish.

2. DB-only dialogues in LevelScreen
- Decision: dialogue prompts are loaded from Supabase `dialogues` table, no hard local fallback in the runtime path.
- File:
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/src/screens/LevelScreen.tsx`
- Trade-off: cleaner source-of-truth in DB, but levels without seeded dialogue rows skip dialogue phase.

3. Profile progression fallback to prevent spinner dead-ends
- Decision: Story/Arcade screens fail soft with fallback progress if profile fetch fails.
- Files:
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/src/screens/StoryModeScreen.tsx`
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/src/screens/ArcadeHubScreen.tsx`
- Trade-off: avoids blocked UX; may mask upstream data/config issues unless logs are monitored.

4. Voice intent matching with confidence gates
- Decision: keep tap as baseline and voice optional; confidence threshold avoids forced misfires.
- File:
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/src/minigames/core/intentMatching.ts`
- Trade-off: safer UX, but lower-confidence inputs require retries/tap fallback.

5. Pronunciation practice integrated into lesson flow
- Decision: practice in Listen & Learn with optional user recording persistence for personal glossary behavior.
- Files:
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/src/screens/LevelScreen.tsx`
  - `/Users/alexanderathienitis/Documents/New project/tuktalk_work/src/lib/pronunciation.ts`
- Trade-off: richer learning loop now, but storage/policy/admin management needs hardening.

---

## 7) What’s Next (Recommended Sequence)

1. Commit and push feature work in coherent slices
- Split into: DB migrations, minigame framework, UI/theme pass, pronunciation features.
- Avoid one giant commit for easier rollback/review.

2. Verify Supabase migration state against target project
- Login CLI and run migration status.
- Confirm `dialogues`, `user_profile_progression`, `user_pronunciations`, and FK indexes are applied.

3. Build dialogue admin UI using existing helper library
- Use `list/upsert/delete/reorder` helpers in `/src/lib/dialogueAdmin.ts`.
- Add role-gated screen and validation rules.

4. Distractor editorial pass
- Enforce one unambiguous correct answer per prompt.
- Add lint-like checks for overly similar distractors.

5. Complete visual direction pass
- Finish full dual-theme art pass (day tropical + night neon) across Home, Level, Story, Arcade, Profile.
- Resolve remaining overlap/spacing regressions on web above-the-fold layouts.

6. Replace `expo-av`
- Migrate to `expo-audio` + `expo-video` to remove SDK54 deprecation warnings.

7. Add E2E sanity checks
- Story load, Arcade load, level complete/unlock path, dialogue fetch path, pronunciation save/read path.

