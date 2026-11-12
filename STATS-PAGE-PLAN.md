# RunOrPay: statistics and head-to-head page

Research and implementation plan, 12 November 2026, with local progress below. The initial stats page does not change the watcher, server, database, WhatsApp bridge, deployment, or challenge rules. Existing uncommitted dashboard edits must be preserved. Verify deployed versions separately; this review is based on the repository and the terminal output supplied in the conversation, not an authenticated inspection of both runners' accounts.

## Implementation progress

- [x] Local first version of `dashboard/stats.html`: recorded distance and runs, days with runs, average run distance, longest run, best recorded London week, total and longest moving time, and weighted whole-run average pace and speed for each runner, with side-by-side comparisons where meaningful.
- [x] Half-mile, mile and 5K remain unavailable; no effort or segment is inferred from a whole-run average. Source coverage and rounded precision are disclosed.
- [x] The new page uses the existing authenticated read endpoint and stored dashboard key, validates data, rejects truncated results, retries cautiously after HTTP 429 and performs at most one automatic request per minute while visible. It adds no Strava watcher checks.
- [x] Automated coverage for weighted calculations, missing/invalid durations, two runners, protected endpoint integration, incomplete data, expired credentials and 429 backoff.
- [x] Both pages now use matching navigation; comparisons avoid declaring a pace winner from approximate whole-run averages and indicate ties at displayed precision. Connection indicators no longer rely on the newer CSS `:has()` selector.
- [x] Existing-time calculations use only recorded moving time; they do not distinguish walking within a run. The second page reuses a key remembered in the same browser; with "keep me signed in" off, navigating between separate pages requires signing in again.
- [ ] Browser verification on desktop and mobile, real-account source verification and end-to-end deployed validation remain outstanding.
- [ ] The existing 2,000-record endpoint limit remains unresolved; the page fails closed above it. No unbounded lifetime claim or scalable aggregation is implemented yet.
- [ ] Athlete-specific detailed splits, best efforts, elevation and steps require a verified authorised data source; no source adapter, migration, backfill or changes to the existing watcher are included.
- [ ] None of the stats implementation has been committed, pushed or deployed.

The new page polls the project's own server, not the Strava API. Strava documents separate 15-minute and daily API limits, not a monthly reset; those limits must not be assumed to apply to the website scraper. No scheduling can guarantee that an external provider will never rate-limit requests. See [Strava rate limits](https://developers.strava.com/docs/rate-limits/) and [Strava terms](https://www.strava.com/legal/terms?hl=en-GB).

## 1. Product goal

Add a second, private-data-aware dashboard page for Karolis and Lorenas. Each runner sees their own statistics and a side-by-side comparison, with highlights that say what is being compared and how much source data is available. The existing challenge page, 10 km/5 km targets, WhatsApp notifications, scoring rules and established records must continue working. No fake records, invented splits or claims of complete lifetime history.

A useful first screen should answer: Who has run furthest in one activity? What are each person's best verified half-mile, mile and 5K efforts? How much and how often have they run? What are the differences in their available recorded data? The two people can have different devices and different data; missing values are not zero and do not constitute a win.

## 2. What is established today

- [x] Repository inspected: `whatsapp/strava-watcher.js`, `whatsapp/strava-parse.js`, `src/worker.js`, `schema.sql`, `src/sqlite-binding.js`, `dashboard/app.js`, related tests and existing integration documents.
- [x] The watcher loads recent activity cards from two configured Strava profiles, filters run types, opens each activity and parses the page title, calendar date, displayed distance and displayed moving time. It identifies the athlete through the profile configuration and uses the Strava activity ID to deduplicate.
- [x] Database stores runner, source ID, date anchor (`started_at`), metres, update time and optional moving-time text. The timestamp in this watcher is synthetic noon UTC for the activity's calendar date; it is not the start time. Displayed distance can already be rounded; its conversion to metres does not make it exact.
- [x] Strava page text previously provided in the conversation displayed pace and elevation for one run, and displayed steps for a walk. This demonstrates that those labels appeared in those specific examples; it does not show that they are available or parsable for all runs, devices, athletes or privacy settings.
- [x] A screenshot or DOM showing pace/elevation is not evidence that the running bot currently records those fields: it does not. Whole-run pace can be estimated from current records only when a reliable duration can be parsed, and has the limitations below.
- [x] No activity samples, individual splits, route traces, best-effort times, steps, elevation, heart rate or cadence are stored by the current watcher. No verified local archive or live authenticated data from both participants was inspected for this plan.
- [x] The dashboard read endpoint returns at most 2,000 rows and flags truncation; the client refuses to present incomplete totals. It cannot grow indefinitely in its current form.
- [x] The watcher reads only the activities loaded on the profile: old activities, edits, deletions, private runs and a missed burst of uploads may be absent. "Lifetime" means the lifetime of recorded, available data, not an established complete Strava history.
- [x] Current challenge window is 9 November–31 December 2026; the local watcher/backend includes changes to retain later records separately from challenge notification logic, but the live version and behaviour must be verified before relying on that claim. Existing phone-export prototypes are not validated as an automatic source for both participants.
- [ ] Confirm actual VM versions, health, recent check results, connected athlete identities, record count, duplicates, database backup and current deployment state without revealing session files, tokens or the dashboard key.

## 3. Important source and policy decision

Strava's terms currently prohibit automated collection and screen scraping, including while logged in. The existing Puppeteer watcher is automated scraping; expanding it to collect more fields has the same issue. This is a real constraint even for a personal challenge. Source: [Strava Terms](https://www.strava.com/legal/terms?hl=en-GB). Do not represent this as permitted simply because the data is visible or both runners consent.

Strava's own export instructions say free users can export individual original activity files or request an account archive. Original files may be FIT, GPX or TCX and their content depends on the recording device and original file. GPX/TCX export can require GPS data; not every export contains a route, timestamps, steps or heart rate. Source: [Strava data export](https://support.strava.com/en-us/articles/15401919-how-do-i-export-my-strava-data).

**Recommended path:** investigate an authorised automatic source directly from each runner's recording device or health platform, separately for each platform and both participants, and use original activity-file imports as a manual fallback/backfill. Do not promise this is free, automatic or supported until verified for their actual devices, permissions, background behaviour, costs and terms. Importing a manually exported file is not the fully automatic experience requested; label it honestly. The user's preference is no Strava API, so this plan does not assume or require one. The sources' policies and scope still need checking for any chosen integration.

- [ ] Identify how each runner records (phone/watch, OS, app), whether route/time samples exist, and how each source can explicitly share data with this project.
- [ ] Verify costs, required subscriptions, consent, revocation, supported background delivery and export permissions for each candidate with official documentation and a test on each actual device.
- [ ] Test privacy impact and select a source only after both runners agree; do not collect a GPS route just because it exists. If no acceptable automatic source is feasible, report this plainly.
- [ ] Decide separately what to do about the existing watcher. Do not silently disable, expand, or deploy changes to a working challenge integration under this plan.

## 4. Metric definitions and evidence

| Metric | Correct definition | Available from current records? | Required additions / caveats |
|---|---|---|---|
| Longest single run | Largest recorded activity distance, per runner | Yes, among observed runs | Rounded displayed distance; label "longest recorded run"; ties; exclude deleted/non-run activities after reconciliation |
| Total recorded distance, run count, longest duration | Sum/count/max from valid stored activities | Generally, subject to missing durations and coverage | Keep individual missing data distinct; show date range/count and coverage |
| Average moving pace | Sum of eligible moving seconds divided by sum of eligible metres, expressed min/km or min/mile | Possible for valid durations | Weight by distance; include only runs with both distance and moving time; disclose excluded runs; displayed rounding; moving can include walking |
| Average moving speed | Total eligible distance / total eligible moving seconds, km/h | Possible with same subset | Guard zero time; weight by time; don't confuse with average of run speeds |
| Fastest whole-run pace | Lowest moving seconds/metre over whole qualifying activities | Possible with valid durations | A 30 m test may win; show each run's distance and time. An optional minimum distance must be explicitly labelled and agreed, not silently imposed |
| Fastest half-mile | Minimum elapsed time for a **continuous 804.672 m** interval within a qualifying recorded run | No | Reliable distance/time samples or a trustworthy source-supplied best effort; never scale a whole-run average or add unrelated best splits |
| Fastest mile | Minimum elapsed time for a **continuous 1,609.344 m** interval | No | Same; distinguish GPS-derived estimate from official/chip result and record the method |
| Fastest 5K | Minimum elapsed time for a continuous 5,000 m interval | No | Same; a run shorter than the distance is ineligible; GPS error and pause behaviour affect results |
| Elevation gained | Activity's elevation gain, in metres; total or maximum separately labelled | No | Source value and methodology required; do not turn missing into zero; GPS and barometer/correction differ |
| Steps | Recorded run step count | No | Only if an authorised source actually supplies a per-run count; steps are device- and permission-dependent. Strava says run steps generally appear on challenge leaderboards rather than the individual activity page: [Steps on Strava](https://support.strava.com/en-us/articles/15401672-steps-on-strava) |
| Heart rate / cadence | Measured value over activity, with units and coverage | No | Optional sensor data, consent and correct aggregation; not comparable when one runner lacks a sensor |
| Route / start time | Precise route or real start timestamp | No | No automatic collection by default; route privacy is sensitive. Current noon anchor is not a real start |

Strava's [Best Efforts](https://support.strava.com/en-us/articles/15401661-how-do-best-efforts-work-for-running-on-strava) uses GPS activity data and elapsed time and includes half-mile, mile and 5K. Its results may be manually edited or removed, so a locally computed estimate cannot be presented as an identical Strava PR or official race result. [Moving versus elapsed time](https://support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations): elapsed includes stops; moving time follows the source's movement/pause handling. A run may include walking. Explicitly label every result's time basis.

### Exact calculations for a locally derived best effort

- [ ] Use an activity's timestamped cumulative-distance samples, normalised to metres and UTC instants; use monotonic timestamps and distance or reject/flag invalid records.
- [ ] For each possible continuous start/end window of at least the target distance within **one activity**, interpolate the boundary position/time between adjacent valid samples; minimise elapsed duration. Implement and validate a linear-time sliding/two-pointer algorithm against a simple reference implementation.
- [ ] Elapsed time includes pauses and gaps represented by timestamps. Do not splice two activities, reset clock at a pause, sum non-adjacent splits, extrapolate beyond measured distance, or substitute total-run averages. Fixed 1 km or 1 mile splits cannot establish the fastest arbitrary rolling interval.
- [ ] Set and document a maximum acceptable timestamp/sample gap and GPS-quality policy before publishing computed personal bests; distinguish unknown quality from poor quality. No default threshold should be presented as Strava's rule.
- [ ] Store the algorithm/version, distance/time source, time basis, activity ID, achieved interval and quality status; keep raw route data private or avoid retaining it after calculation if recalculation/consent policy allows. Show "estimated from recorded data" and an approximate value when appropriate.
- [ ] Handle GPS drift, outlier jumps, duplicated points, paused recordings, sparse samples, zero distance, manual runs, indoor/treadmill activities, ties, source edits, removed PRs and corrections. Do not claim official race timing or exact parity with Strava.
- [ ] Guard against false precision: display rounded source distance as recorded; don't rank close efforts more precisely than the evidence permits. For Strava-only rounded 0.01 km distance and whole-run moving time, label calculated values approximate.

## 5. Proposed page and behaviour

Use the existing visual language, same private access mechanism and same live data connection. Do not add a fake populated demo to production. Provide a separate route/page with navigation back to the challenge, and preserve the current page's layout and behaviour.

1. **Heading and range:** "Running stats"; overall recorded data plus a week/4 weeks/all-recorded range selector only where the data is sufficiently complete. Show actual data coverage and last successful source check separately from dashboard fetch time.
2. **Runner selection:** Karolis / Lorenas / Compare. On mobile, use tabs; on desktop offer a balanced comparison. Selected state accessible to keyboard and screen readers.
3. **Highlights:** longest recorded run, best verified half-mile/mile/5K and weighted average pace; display "Not available" with a simple reason until evidence exists. Show the run date, effort distance and source/method on demand. Run tests or very short activities should not dominate a comparison unless the chosen metric explicitly permits them.
4. **1v1 comparison:** one row per genuinely comparable metric; names, both values, a neutral tie state and a restrained indicator for higher/lower winner. "Faster" is lower duration for the same distance; "further" is greater distance. Do not collapse different goals, weeks or unmatched sensors into an overall winner.
5. **Trends:** distance and count over time; eventually verified pace and elevation only where available. Allow toggling runners; labels and legend make charts understandable without colour alone. No false zeroes for periods with unknown coverage.
6. **Run detail:** recent qualifying runs with distance, moving time, date and individually sourced optional values. Navigate to a trustworthy source if available without exposing restricted IDs or a private route unnecessarily.
7. **States:** not connected, loading, connected, no runs, no best-effort data, unavailable sensor, partial history, stale source, malformed response, revoked access and offline. Account for keyboard, mobile, contrast, colour independence, reduced motion and readable dates.

Potential labels: "Recorded best mile", "Longest recorded run", "Average moving pace", "Elevation gain (when recorded)". A recent upload's watcher status is separate from the dashboard's last successful fetch. Avoid "lifetime Strava PR" unless complete historical evidence is verified.

## 6. Architecture and migration plan

Current flow: profile watcher → protected `/ingest/:runner` → SQLite activities/outbox → WhatsApp bridge; separate protected `/dashboard/runs` → GitHub Pages. Retain the existing path until a tested, approved source replacement is ready.

### Data contracts

- [ ] Define an internal source-neutral activity model: runner ID, source namespace, source activity ID, sport, date and date precision, real start instant only if known, exact/rounded distance and provenance, moving/elapsed duration seconds (nullable), recorded elevation gain (nullable), per-run step count (nullable), source modified time, retrieved/checked time and coverage state. Validate units and ranges; no implicit zero values.
- [ ] Store each best effort as `(runner, source activity, target metres, elapsed seconds, method, algorithm version, quality, computed_at)` with a unique key; a verified native effort can have separate provenance from a locally calculated effort. Keep imports and calculations idempotent.
- [ ] For time-series evidence, decide whether to retain minimum distance/time samples or only reproducible derived efforts. If retaining GPS coordinates, secure them as sensitive location data, define retention/deletion and restrict access; never place files in Git or public Pages. Store no unnecessary route data.
- [ ] Address identity and duplicates across sources explicitly: the same physical run may arrive via Strava, HealthKit and file import under different IDs. Use stable source-to-canonical mappings and a conservative, reviewable match, never auto-merge based only on distance/date. Record edits and deletions; recompute records when a source activity changes.
- [ ] Design incremental, repeatable SQLite migrations and D1 compatibility if that deployment remains relevant. Keep old fields readable during a staged rollout; back up SQLite with a consistent backup mechanism and test restoring it. Avoid destructive database rebuilds.

### API and scalability

- [ ] Keep existing `/dashboard/runs` response compatible for the current page. Design a new versioned, read-only statistics endpoint rather than adding sensitive columns indiscriminately to a public response.
- [ ] Use DB-side aggregate queries for lifetime totals/longest run and indexed date-filtered queries for a bounded current week; return only a small page of recent runs. Provide explicit `partial`, `record_count`, source coverage/date range and per-stat method/availability fields.
- [ ] Use stable keyset pagination for detailed history if needed; tests must cover equal dates, edits during paging, and duplicate IDs. Document consistency or use a snapshot/cutoff. The design must exceed 2,000 records without calling a partial result complete.
- [ ] Authorise every stats response with the existing separate read credential, minimum exposed fields, exact permitted browser origin and no-store headers. CORS is not authentication. Confirm server rate limiting, avoid logging headers, and keep protected admin/ingest endpoints off the public proxy.
- [ ] The current shared access key is persistent in localStorage on the GitHub Pages origin when selected. It is readable by other scripts on that origin and cannot distinguish either person. Compare a more suitable authentication approach before adding health metrics; do not put secrets in public HTML, URLs, Git or a shareable static JSON file.
- [ ] Implement responsive, accessible static page using existing vanilla JS/CSS; reuse connection state rather than repeatedly requesting a key. Fetch stats on page open and at a sensible interval, show last successful update, handle stale/outage states and avoid visual flicker.
- [ ] Do not change WhatsApp messages, challenge targets, time-zone rules, debts or success criteria as part of statistics unless separately requested and tested.

## 7. Coverage, history and reliability

- [ ] Agree whether the page starts from bot activation, from new authorised imports, or a verified historical backfill. Explain records before that date may be missing; never call incomplete history a complete lifetime record.
- [ ] Separately inventory historical source files/records for **both** runners, with permission. File export may be manual; bulk processing needs explicit policy review and should not be claimed automatic. Record provenance and import checkpoints.
- [ ] Verify updates/deletes; correct stats if a run changes type, distance, privacy or is removed. Historical reconciliation cannot rely solely on the recent profile feed.
- [ ] Distinguish last dashboard fetch, last successful source sync, source check errors and last known activity. Add meaningful alerts and a recovery path for a failed sync, stale credentials and a paused WhatsApp outbox.
- [ ] Backup and restore SQLite and any approved file store; avoid unauthorised access to session directories. Document retention, revocation, and removal per participant. Never use incomplete stats to decide a monetary penalty.

## 8. Verification and acceptance checklist

### Controlled discovery
- [ ] With explicit access and without exposing private data, inspect one consenting runner's authorised source file and one from the other; capture only redacted schemas/fixtures. Verify whether each source contains timestamps, distance samples, elapsed/moving duration, elevation, steps and existing best efforts. Log absence separately from zero.
- [ ] Compare one short run and one normal run with each original device display. Observe units, rounding and time basis. Check privacy, language and alternate layouts if applicable. Confirm exact evidence before claiming any new field can be collected.

### Automated tests
- [ ] Unit test duration parsing (seconds, mm:ss, h:mm:ss), kilometres/miles/metres, weighted average, divide-by-zero, rounding, negative/invalid input, unavailable durations and small-run eligibility.
- [ ] Use a deliberately uneven synthetic 5-mile run whose first mile is fast and remainder slow/walked: the 1-mile record must come from an actual continuous interval, not one fifth of whole-run time. Compare computed efforts with a manually checked reference; test gaps, pause, irregular samples, interpolation, ties and <target distance.
- [ ] Test two runners, multiple sources, duplicate imports, corrections, deletions, metric recalculation, out-of-order samples, invalid/sparse GPS, missing sensors and the actual source's normal and exceptional formats.
- [ ] Test London Monday boundaries and daylight saving; never infer a real time from the noon placeholder. Verify >2,000 recorded rows, bounded recent history, multiple users, no partial totals labelled complete and backwards-compatible API.
- [ ] Test migration from a copy of the current schema, re-running migration, backup/restore, no lost activities or notification states and outbox behaviour under restart/uncertain delivery.
- [ ] Test authentication and origin failures, revoked access, no secrets in responses/logs, malformed data, retries, old browsers, persisted-key expiry, request race conditions and unavailable localStorage.
- [ ] Test existing challenge tests, watcher ingestion and WhatsApp flows; verify no new announcements or scoring changes.

### Human and browser QA
- [ ] Desktop, tablet and small mobile screens; check no overflow, text/contrast, colour-independent charts, focus order, accessibility names, zoom, reduced motion, screen-reader output and every empty/error/loading state.
- [ ] Use clearly labelled synthetic fixtures, never invent real achievements; independently compare outputs from consenting runners' actual source data against their devices/Strava display, noting timing-method and rounding differences.
- [ ] Demonstrate longest run from real records, an exactly measured source-supported rolling mile and 5K where present, weighted average and comparisons. If either runner has no source samples, explicitly show unavailable.

## 9. Phased delivery and release gates

- [ ] **Phase 0 — source decision:** inventory devices and data; verify source rules, reliability, privacy, cost and consent. Do not proceed as if scraping expansion or real splits were established.
- [ ] **Phase 1 — existing-data page:** source-neutral recorded totals, weighted whole-run pace when duration is present, longest run, clear date coverage and no unsupported best efforts. Fix >2,000-record design before calling it scalable. Page can be prepared with real source-backed values, not fabricated data.
- [ ] **Phase 2 — richer verified data:** approved source adapter and migration for elapsed time, elevation and other fields actually supplied. Preserve old records; unknown optional fields stay null. Validate both people separately.
- [ ] **Phase 3 — true best efforts:** add evidence-backed interval calculations and 1v1 only after time/distance samples or verified best-effort source values exist, with provenance and quality checks.
- [ ] **Phase 4 — operational hardening:** reconciliation, data deletion, backups, monitoring, alerts and recovery drills. Verify user experience and session handling on both phones.
- [ ] **Phase 5 — staged rollout:** review Git diff and secrets; run full checks; obtain required separate permissions for commit, push and deployment. Back up the VM, deploy backend in a compatible staged order, run authenticated and unauthenticated smoke checks, verify bot/queue continuity and rollback, then deploy the static frontend. GitHub Pages production push is a deployment; server changes are separate. No deployment is authorised by this plan.

## 10. Decisions before implementation

1. How does each runner record and sync runs (phone OS, watch and source app), and is automatic access to distance/time samples available with both users' consent and without extra cost?
2. Is the intended history all previously recorded runs, or from a specified start date? An honest answer depends on recoverable source data.
3. For best efforts, use elapsed-time GPS-derived rolling intervals, a trusted independently supplied effort, or both as separate labelled categories? Decide how to handle GPS errors, edits, pauses, indoor/manual activities and ambiguous source matches.
4. Is the existing shared key acceptable for additional health metrics? Which fields do both runners consent to collect, compare, retain or delete?
5. Is a minimum distance desirable for the **whole-run average pace** comparison? This does not change the half-mile/mile/5K definitions.

## Sources

- [Strava Terms of Service](https://www.strava.com/legal/terms?hl=en-GB): automated access and scraping prohibition.
- [How Do Best Efforts Work for Running?](https://support.strava.com/en-us/articles/15401661-how-do-best-efforts-work-for-running-on-strava): running effort distances, GPS and elapsed-time basis.
- [Moving Time, Speed, and Pace Calculations](https://support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations): timing semantics.
- [Elevation on Strava FAQs](https://support.strava.com/en-us/articles/15402093-elevation-on-strava-faqs): measurement sources, correction and limitations.
- [Steps on Strava](https://support.strava.com/en-us/articles/15401672-steps-on-strava): run-step availability and device requirements.
- [How Do I Export My Strava Data?](https://support.strava.com/en-us/articles/15401919-how-do-i-export-my-strava-data): free-user original and archive exports and format limitations.
- [Run Activity Pages](https://support.strava.com/en-us/articles/15401883-run-activity-pages): splits, laps and pace analysis availability.
