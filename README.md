# Run or Pay

A two-person running challenge. The existing Oracle server checks visible Strava runs and sends updates to a WhatsApp group. The dashboard in `dashboard/` is being developed to show the recorded runs; the current public website is not yet connected to live Oracle data.

- Karolis: 10 km per London week; Lorenas: 5 km.
- The currently configured challenge runs from 9 November through 31 December 2026. Confirm before changing those dates.
- The development watcher retains observed runs outside that challenge for recorded lifetime distance. Weekly challenge notifications and £50 outcomes remain limited to the configured period; this change is not automatically live.
- The bot can only record activities it discovers and can view; it does not establish complete Strava history. The website must not assume missing runs mean no runs.
- Strava is read through the existing browser-based watcher, not the Strava API.

Run `npm test` from this directory to check the local code. The dashboard can be opened locally using `dashboard/index.html`, but its live connection requires separately configured HTTPS, server settings and deployment.

Read [the implementation guide](IMPLEMENTATION-GUIDE.md), [the data audit](DASHBOARD-PLAN.md), and [the dashboard connection plan](DASHBOARD-CONNECTION.md) before changing the live system. Do not commit credentials, session files, databases or private snapshots.
