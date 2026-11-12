# Run or Pay

A two-person running challenge: Karolis has a 10 km weekly target and Lorenas has a 5 km target. Weeks run Monday to Sunday in Europe/London. The currently configured challenge period is 9 November–31 December 2026; changing that period or the challenge rules requires agreement.

## How it works

The existing Strava watcher uses a signed-in Chromium session to inspect visible profile activities. It sends recognised runs to the challenge service on the Oracle VM. The Node service stores activities and notification state in SQLite; a separate WhatsApp bridge sends queued messages. A systemd timer runs the watcher. The dashboard is a static GitHub Pages site that polls a protected read-only HTTPS endpoint and calculates weekly progress and recorded overall distance from its response.

The user's previous checks showed the Oracle services and a 15-minute watcher timer active, and the dashboard connected to recorded runs. These are observations, not a current health check: the deployed server, timer, session and data coverage must be verified in their own environment. This repository may contain changes that are not live.

The watcher only records activities it can see and discover. It does not verify complete Strava history and may miss older runs, corrections or deletions. The current API returns at most 2,000 runs and flags truncation; the dashboard refuses to calculate partial totals. The server code in this checkout retains observed runs outside the challenge period, but this behaviour must be deployed separately before assuming it exists on the server. Challenge messages and scoring remain restricted to the configured period.

## Develop and test

Use Node.js 24 or later with SQLite support. Run `npm test` from the repository root. Serve the `dashboard/` directory with a local static server to inspect the interface; the configured live API allows only its configured origin, so a local preview is not automatically authenticated. Never commit a real snapshot, database, session directory, token or environment file.

The dashboard polls every minute while connected. It can remember the shared read key in browser local storage only when the user selects that option. Other scripts hosted on the same origin can access that key; use a trusted device and sign out to remove it. A shared key is not a personal account and should be rotated if exposed.

The local `dashboard/stats.html` page compares recorded distance, run count, longest and average run distance, best recorded week and whole-run moving pace. Individual cards also show days with runs, moving time and speed. It uses the existing dashboard endpoint and its current 2,000-record limit. Best efforts are not shown because existing records do not include within-run timing data. The source sync and dashboard fetch are separate: changing the page refresh interval does not make the Strava watcher run more often. If "keep me signed in" is off, switching pages requires the access key again.

## Deployment and operations

GitHub Pages publishes `dashboard/` using `.github/workflows/pages.yml` when `production` is pushed. The Oracle service, SQLite data, watcher and WhatsApp bridge are separate and are not updated by that workflow. Deploy server changes only after reviewing the exact files, backup and rollback approach, migrations, service health and the required separate authorisation. Update version suffixes on changed dashboard CSS or JavaScript so browsers do not mix incompatible assets.

The dashboard endpoint requires a separate read secret and an exact permitted Origin. CORS is not authentication. Keep the Node listener private and expose only the intended HTTPS read route. The setup has not been independently audited for rate limiting or reliable automated failure alerts. See [dashboard connection notes](DASHBOARD-CONNECTION.md) and [implementation guide](IMPLEMENTATION-GUIDE.md) for context; older planning documents describe proposals and may not reflect the running deployment.
