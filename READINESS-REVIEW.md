# Run or Pay: dashboard and live system readiness review

Scope: local source review and local tests. This is not an independent penetration test and does not verify the present state of the Oracle server, a GitHub account or third-party services. No push, server change or deployment was performed.

## Goal

Runs recorded on Strava should be discovered by the existing Oracle watcher, stored, announced in the WhatsApp group, and displayed as current weekly and historical challenge statistics on a website. Karolis's weekly target is 10 km and Lorenas's is 5 km; use London weeks. The user wants no fictional data, no new paid service and no Strava API.

## Release blockers

1. **No live stats connection.** `dashboard/app.js` only accepts a user-selected local JSON file. It does not fetch data from Oracle, and GitHub Pages cannot access the private SQLite database. The server listens on `127.0.0.1` and its existing reporting endpoints require administrator credentials. A read-only, authenticated, limited data path and secure hosting are not implemented.
2. **No configured GitHub publication.** The repository was initialised locally, has no remote or commits, and the dashboard's entry point is under `dashboard/`. GitHub branch-based Pages sources normally select repository root or `/docs`, not this subdirectory; a workflow or deliberate source layout would be required. Do not push until approved and destinations/deployment effects are known.
3. **Privacy model undecided.** Standard GitHub Pages is publicly visible. An obscure URL is not authentication. Never put admin secrets, session cookies, SSH keys, private database exports or health data in the page or a public repo. Decide whether both participants consent to public stats or implement actual access control.
4. **Data completeness.** The watcher loads activity cards available on each profile; no complete pagination, missed-run recovery or deletion reconciliation is established. Recent runs visible to another Strava account may be limited by activity privacy or a layout change. Weekly totals may be incomplete, and the displayed source distance may be rounded.
5. **Challenge expiration.** `src/challenge.js` ends the challenge on 2026-12-31. Past that date the current watcher will skip runs and the report rejects dates outside the challenge. Confirm intended end date before changing business rules.
6. **Moving time is not in the activities table.** It is used when constructing a notification, but historical run durations cannot be accurately displayed as structured data without a migration and, if available and approved, backfill.
7. **Live status is not established.** User previously reported one scheduled detection and WhatsApp delivery, but no independent server inspection is available in this workspace. The timer being active or having a successful exit does not establish that it saw every run or the bridge is ready. Add freshness, failure and missing-session monitoring.
8. **Delivery recovery and edits remain incomplete.** Claimed messages are not retried automatically after uncertain delivery and need manual review; updates/deletes during delivery and crash boundaries still require further work. Data completeness is insufficient for automated final penalty decisions.

## Local adversarial checks and changes

- Tested unauthenticated attempts against protected service routes through existing tests; they returned 401.
- Tested that invalid dashboard snapshot input clears previously displayed data rather than leaving stale numbers under an error status.
- Tested that a dashboard left open over the London Monday boundary recalculates the week, rather than continuing to show the prior week's totals.
- Inspected dynamic HTML inputs: runner values are allowlisted, timestamps validated and rendered strings escaped; snapshot import is local and no credentials are included.
- Added `.DS_Store` to ignored files. Ignore rules are not a substitute for reviewing staged content and scanning for secrets before any future commit.
- Backend and dashboard tests pass locally. These do not prove real Strava, WhatsApp, reboot recovery, database migration, public hosting or security under attack.

## Work remaining before a live release

- [ ] Agree on public versus private dashboard and explicit consent for both participants.
- [ ] Confirm challenge dates, scoring, history coverage and correction policy.
- [ ] Build and test the chosen secure, read-only stats delivery path without exposing the existing admin API or its secrets.
- [ ] Add structured duration and explicit date/source/precision fields, with a safe SQLite migration and backup/restore test.
- [ ] Implement and test stale/error status, missing activities, corrections and outage recovery.
- [ ] Test a scheduled real run for each person through the database, dashboard and WhatsApp, including Monday rollover and restart.
- [ ] Review files for secrets and obtain separate explicit authorisation for commit, named remote/branch push and deployment, including automatic deployment consequences.

References: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages and https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
