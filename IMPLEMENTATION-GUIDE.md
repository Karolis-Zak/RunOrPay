# Run or Pay dashboard — implementation guide

Status: **local design and demonstration only**. No dashboard has been deployed, connected to Oracle, or published to GitHub. The existing WhatsApp bot is a separate running service; changes to this project are not automatically deployed. Last reviewed against the local source and user-provided Oracle output; this is not a live server audit.

## 1. Outcome and boundaries

- [x] Establish the aim: two-person running challenge with a website in addition to the WhatsApp bot.
- [x] Keep the existing unofficial browser-based Strava watcher; user does not want the Strava API.
- [x] Keep the project local until the user separately confirms a specific push or deployment under workspace `AGENTS.md`.
- [x] Prepare a local Git repository. Initialisation does not create a commit, GitHub repository, remote, push or deployment.
- [x] Build a responsive first dashboard without example values. A user-selected local JSON snapshot can display real recorded rows; it is not live or automatically refreshed.
- [ ] Decide whether the site will be private to the two runners or public, and obtain each participant's informed agreement for the information shown.
- [ ] Decide whether to host the dashboard on the existing Oracle VM or GitHub Pages. Both require an explicit deployment decision and separate approval. Avoid any paid services unless requested.
- [ ] Confirm whether the fixed challenge dates (9 November through 31 December 2026) remain correct or the challenge should continue beyond them.
- [ ] Confirm what happens if a run or profile is unavailable, edited or deleted, and whether monetary outcomes require manual review.

## 2. Existing flow: from Strava to WhatsApp

1. Each participant records and saves a run on Strava. Activity visibility must allow the server's signed-in alternate account to view it. A follower-only run requires that account to be an approved follower; a run set to only the athlete cannot be read by that separate account.
2. Oracle's user-level `run-or-pay-strava.timer` is configured for roughly 15 minutes after a check ends. The user previously showed `active` and a successful execution. Timings are approximate and can be delayed by the check duration or downtime.
3. `whatsapp/strava-watcher.js` opens each profile with Chromium and the private persistent Strava session. It searches observed activity icon markup for a running type, resolves an unambiguous activity ID and opens the details page. A profile can fail independently of the other.
4. `whatsapp/strava-parse.js` validates the activity page title/type, visible calendar date, displayed distance and moving time. The observed page supplies no machine-readable start time; noon UTC is currently used as an internal calendar-day anchor, not the actual time of day. Displayed distance may be rounded.
5. Only runs within the hard-coded challenge period are sent over localhost to `/ingest/Karolis` or `/ingest/Lorenas`, using participant-specific server-side secrets. `src/worker.js` validates input and upserts to SQLite. The unique key is runner plus activity ID.
6. `src/report.js`, `src/challenge.js` and `src/scoring.js` group stored runs by London calendar week, use the 10 km and 5 km targets and calculate progress. A Monday starts a new reporting period; old records remain in storage.
7. `src/messages.js` builds a notification with distance, moving time and remaining weekly distance. The service queues it and the WhatsApp bridge processes the queue for the configured group. The newer delivery code claims messages before sending and uses acknowledgement checks; uncertain in-flight deliveries require review rather than automatic retry.
8. The user reported that a short run appeared in the group through the scheduled flow. This verifies an example, not complete coverage or error-free operation for all future runs.

## 3. Data inventory and limitations

### Available from existing stored activity rows

- [x] Runner: `Karolis` or `Lorenas`.
- [x] Source activity ID for deduplication.
- [x] Internal date anchor (`started_at`): usable as the observed date for the current scraper, but **not** a verified activity start time. Other ingestion adapters may have real timestamps, so the data model needs explicit source and precision before treating all entries alike.
- [x] Distance in integer metres as calculated from Strava's displayed, possibly rounded, distance.
- [x] Last local update time.
- [ ] Verify the production database path and observed contents without disclosing credentials before a migration.
- [ ] Treat all historical totals as **recorded by the bot**, not complete Strava history. The profile previously returned only a few activity cards.

### Observed but not durably stored as structured fields

- [x] Moving time is extracted and placed in a new-run notification; the activities table does not separately persist it. Notification text is not a reliable structured run-history source.
- [x] Run type is checked; title is used to help verify detail-page type and is not stored.
- [x] Pace, elevation and elapsed time were seen in the user's shared activity page output, but are not currently parsed and stored. Do not assume they are present on all runs.
- [ ] Add optional, nullable moving duration with clear source and units. Decide migration and historical backfill only after inspection and privacy approval. Never fabricate a historical value.
- [ ] Add pace/elevation only if both runners want them, the pages expose them, and real fixtures plus failure cases are validated.
- [ ] Do not collect routes, GPS tracks, location, heart rate, photos or biometric data by default.

### Already defined challenge rules

- [x] Karolis target: 10 km per London week.
- [x] Lorenas target: 5 km per London week.
- [x] Target comparison can be ranked by percentage of each runner's own target.
- [x] Existing tests exercise week boundaries, duplicate IDs, target arithmetic and unverified settlement.
- [ ] Clarify whether the last partial challenge week has full targets; code currently applies full targets through 31 December 2026.
- [ ] Preserve the existing £50 logic and both-fail net-zero rule, but do not display a confirmed debt without a reliable completeness and agreement process.
- [ ] Decide policy for runs near midnight, foreign time zones and Strava-local dates; the noon placeholder must not be presented as a real start time.

## 4. Dashboard pages and states

### Overview

- [x] First visual implementation: concise header, two progress cards, leaderboard, recent runs and explanation.
- [x] No sample run data is shown. The disconnected state does not imply zero runs; optional local snapshots are visibly labelled as not live.
- [ ] Display the current London week and date range from the server, including period end.
- [ ] For each runner show stored distance, personal goal, remaining distance, completion percentage and accessible progress bar.
- [ ] Define a tie rule and treatment of values above 100%; keep numerical totals visible even if the visual bar is capped.
- [ ] Show source coverage and last successful check, last attempted check and whether sync is delayed or failed. A running process alone is not evidence of a successful data sync.
- [ ] Provide honest loading, no-runs, no-connection, stale, permission-denied and partial-data states; never turn a failed request into a real zero.

### Recent runs and history

- [ ] Show runner, activity date, distance and stored moving duration when available; show `Not available` otherwise.
- [ ] Decide whether a Strava activity link may be shared, respecting both runners' wishes and activity visibility.
- [ ] Sort by actual activity date and a stable ID, not by the synthetic noon time; make equal-date ordering clear.
- [ ] Add pagination, date/week filtering and keyboard-accessible controls if the history grows.
- [ ] Offer previous-week totals and a count of recorded runs; display the earliest coverage date and caveat gaps or missed checks.
- [ ] Do not use unavailable historic moving times to calculate personal records or pace averages.

### Responsive and inclusive behaviour

- [x] Use semantic headings, a navigation landmark, tables, labels, visible focus states and progress-bar values.
- [x] Provide responsive layouts for small screens and horizontal table overflow.
- [ ] Verify real keyboard navigation, focus indication, contrast, zoom, screen-reader announcements and reduced-motion behaviour on desktop and mobile.
- [ ] Test empty content, unusually long names, small viewports, very large distances and no network.
- [ ] Review final language and visual style with Karolis and Lorenas.

## 5. Privacy, security and architecture

- [ ] Keep Strava session data, WhatsApp session data, `.test-env`, tokens, database files, backups, logs with sensitive information and QR codes out of Git and the public website.
- [ ] Confirm `.gitignore` and scan the entire staged file list for secrets before any future commit. Do not commit without permission.
- [ ] Choose an access model: an unauthenticated site makes any visible stats public, including to someone with the link. An obscure URL is not authentication.
- [ ] Design read-only, least-privilege dashboard authentication before exposing personal stats. Keep `ADMIN_SECRET` and participant ingest secrets server-side; never put them in static browser JavaScript.
- [ ] Add a read-only stats endpoint with input validation and bounded responses. It must not allow writes, expose database paths, return session data or leak other service endpoints.
- [ ] Decide hosting: same Oracle server can serve UI and data behind HTTPS; GitHub Pages can serve static UI but needs an authenticated HTTPS connection to a public stats endpoint or another secure delivery pattern. GitHub Pages cannot directly read Oracle's private SQLite file.
- [ ] Configure TLS, hostname/domain or suitable secure access, origin/CORS policy and firewall rules only as required for the approved design. Never expose the existing localhost-only admin service or database directly to the internet.
- [ ] Verify free-tier limits and resource consumption before choosing infrastructure. Preserve the existing Oracle VM and bot during dashboard development.
- [ ] Explain that browser scraping depends on Strava page structure, account access and platform rules; failures must be observable and must not be mistaken for a runner having no activity.

## 6. Reliability and data integrity

- [ ] Add structured per-profile last-attempt, last-success, failure and coverage information without saving sensitive page content.
- [ ] Test detection of multiple new runs, duplicate rechecks, profile parsing failures, expired sessions, unsupported duration formats, missing fields, hidden activities and profile layout changes.
- [ ] Research and verify whether more than the initially loaded profile cards can be accessed. If not, mark coverage unknown and design an explicit recovery process rather than claiming full history.
- [ ] Define and test reconciliation for activity edits, deletions, run type changes, visibility changes, delayed uploads and activities outside the initial page window.
- [ ] Define how source rounding affects threshold decisions. Do not imply metre-level precision where only rounded display values were captured.
- [ ] Make activity writes and outbox creation durable across a crash; verify concurrent requests. Test restart before send, after claim, after send and after acknowledgement.
- [ ] Provide an observable and safe recovery workflow for a claimed message whose WhatsApp delivery is uncertain. A claimed message is not automatically retried; a human must check the group before deciding what to do.
- [ ] Monitor the server, WhatsApp readiness, timer result and stale checks; `systemctl active` alone does not prove WhatsApp is logged in or a run was found.
- [ ] Establish encrypted backups, restore tests, log retention and a safe migration/rollback plan without copying secrets into the repository.

## 7. Testing and acceptance

- [x] Local backend tests exist for challenge rules, date boundaries, parsing, duplicate runs and messaging. Run `npm test` from the project root before handoff.
- [x] Local demo uses a self-contained static HTML/CSS/JS interface; no dependency installation is required.
- [ ] Test UI at narrow mobile and desktop widths in a real browser and inspect for overflow and console errors.
- [ ] Add meaningful tests for the new stats endpoint, access control, schema migration and each dashboard state once implemented.
- [ ] With both participants' agreement, test one new visible run for each runner end to end: Strava → scheduled check → database → WhatsApp → dashboard; verify 10 km/5 km goals and remaining distance.
- [ ] Test the Monday rollover in London time and historical records across a time-zone change.
- [ ] Confirm data displayed on the dashboard matches stored records and that a stale or unavailable server cannot show false live values.
- [ ] Verify restart after VM reboot and alert/recovery behaviour without sending duplicate group messages.
- [ ] Review the exact files, remote, branch, data migration and effects with the user before requesting a separate deployment confirmation.

## 8. Git and delivery checklist

- [x] Local repository initialised in `run-or-pay`; no commit or remote has been created by this step.
- [ ] Review existing work, including bot changes and generated imagery; stage only files the user wants in the repository.
- [ ] Check `git status`, `.gitignore`, staged diff and secret scan. Do not add `node_modules`, session files, database, environment files or logs.
- [ ] Ask separately before committing. An instruction to initialise or edit does not authorise a commit under workspace restrictions.
- [ ] Before any proposed push, inspect every configured push destination and possible automatic deployment, present exact repository/remote/branches/consequences, and wait for explicit confirmation.
- [ ] Before any deployment, present exact target, migration, downtime and expected effects and wait for a separate explicit confirmation. No production changes are part of the current request.

## Reference sources

- Existing source: `whatsapp/strava-watcher.js`, `whatsapp/strava-parse.js`, `src/worker.js`, `schema.sql`, and `src/challenge.js`.
- [Strava activity visibility](https://support.strava.com/en-us/articles/15401987-how-do-my-activity-privacy-controls-work-on-strava).
- [Dashboard data audit](DASHBOARD-PLAN.md).
