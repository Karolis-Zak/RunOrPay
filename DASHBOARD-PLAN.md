# Run or Pay dashboard: data audit and plan

This plan is based on the local source, the Oracle outputs shared in the conversation, and Strava's documentation. It is not a live inspection of Oracle's database. The pictured dashboard uses fictional values.

## Current data path

The scheduled browser watcher visits each athlete profile and looks for activity icons. For recognised run types it opens the activity page and reads its title, visible calendar date, displayed distance and moving time. It ingests challenge-period runs into the private challenge service; the notification bridge sends queued text to WhatsApp. The checker is scheduled every 15 minutes. Visibility and how much history the profile loads are not proven complete.

The activities table stores runner, Strava activity ID, an internal timestamp, metres and last update time. The timestamp for scraped activities is noon UTC used as a calendar-date anchor; it is not the actual start time. Displayed distances can be rounded. The WhatsApp message can contain moving time, but the activities table does not store it as a separate field. Notifications may contain it as text; they are not a reliable structured history of duration. Existing data cannot be assumed to contain full Strava history. Updates and deletions are not completely reconciled.

We observed one real run page with 0.03 km, 41 seconds moving time and a calendar date; the user confirmed its WhatsApp message arrived. A scheduled check was later confirmed to pick up a run within 15 minutes, per the user's report. This does not prove every run can be discovered.

## Data ledger

| Field or metric | Current state | Dashboard implication |
| --- | --- | --- |
| Athlete, activity ID, date, displayed distance | Parsed and stored for detected challenge-period runs | Recent runs, daily totals, week and challenge totals, run count and longest recorded run are possible; totals depend on coverage. |
| Moving time | Parsed and sent in new messages, not separately persisted | Add structured duration storage and a migration; old durations require separately verified backfill. |
| Run title, sport type | Read to identify running; title not stored | Add fields only if needed; don't trust user-editable title for sport type. |
| Start time | Not observed; noon is a synthetic date anchor | Do not show a time of day. |
| Pace, elevation, elapsed time | Seen on one user-shared activity page; not currently captured or stored | Possible future parsers; need visibility, missing-value handling and tests. The observed 0.03 km run showed pace 19:38/km, elevation 0 m and elapsed time 42s. |
| Heart rate, cadence, routes and maps | Not verified for these accounts or captured | Do not promise; depends on available devices, activity visibility and consent. |
| Full historical runs | Not established; profile inspection returned a few recent cards | Call statistics 'recorded by the bot', not all-time Strava totals. |
| Weekly target | Code defines Karolis 10,000 m and Lorenas 5,000 m | Show progress and remaining distance; rankings by percentage allow different targets. |
| Penalty and settlement | Calculation code exists, but verification and automatic settlement are not established | Show pending, not a confirmed debt, when records are incomplete. |

The challenge dates currently configured in `src/challenge.js` are 9 November–31 December 2026. A future dashboard must explicitly handle dates outside that range.

## Proposed dashboard

1. Overview: weekly progress bars, dates, remaining distance, percentage leaderboard, and sync status.
2. Recent runs: athlete, calendar date, distance and, once stored, moving time. Link to Strava only where permitted and user-approved.
3. History: weekly totals and runs recorded by the bot, with empty, delayed and error states. Show the coverage start date; avoid suggesting completeness.
4. Optional extras after source validation: pace, elevation, streaks and personal bests. Avoid route maps and health metrics unless both participants explicitly want them.

## Implementation sequence

1. Agree access and privacy with both participants. Prefer private access; do not expose tokens, the existing admin endpoints or session directories to the browser.
2. Add a database migration for structured moving time and optional verified fields. Preserve the existing database; tag date-only records and rounded values as such. Add tests for migrations, duplicates, corrections, deletion and calendar boundaries.
3. Design a read-only authenticated stats endpoint that returns only permitted dashboard fields. Keep ingestion and admin secrets on the server. Test access controls and failure modes.
4. Build and test a responsive dashboard using the endpoint. Surface stale or incomplete sync status rather than presenting missing data as zero.
5. Validate end to end with both users' newly recorded runs and existing WhatsApp notifications, then separately obtain deployment approval for the exact destination.

## Sources and constraints

- Strava activity visibility: https://support.strava.com/en-us/articles/15401987-how-do-my-activity-privacy-controls-work-on-strava
- Strava API fields: https://developers.strava.com/docs/reference/
- Strava API policy: https://www.strava.com/legal/api_policy
- Strava's explanation of third-party activity-data display: https://support.strava.com/en-us/articles/15401608-api-agreement-update-how-data-appears-on-3rd-party-apps

The current browser-based watcher is not an official API integration. The official API has its own permission and data-display rules; its published terms and explanatory guidance should be checked against the actual intended design before adopting it. Neither the mockup nor this plan changes the live service.
