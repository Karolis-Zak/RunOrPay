# Dashboard connection

The static dashboard sends the shared read key as a bearer token to the HTTPS `/dashboard/runs` endpoint configured in `dashboard/config.js`. The server requires a separate read secret and exact configured Origin, and returns only the runner, activity date marker, distance and optional moving time. It does not include source IDs. The HTTPS proxy should expose only this read route; the local Node service remains bound to loopback.

A successful response is refreshed every minute while the page is open. The displayed update time is the dashboard's last successful API fetch, not proof that Strava was fully checked at that time. The watcher runs separately. A failed request clears totals so stale data is not shown as current.

The API currently returns no more than 2,000 records and sets `truncated` when there are more. The client treats truncation as an error instead of reporting partial all-time totals. The watcher cannot establish full history coverage, including activities hidden by privacy settings or no longer visible on the profile.

Users may choose to remember the read key in browser local storage. That avoids repeated entry but makes it accessible to scripts on the same GitHub Pages origin and to anyone with access to that browser profile. Sign out removes it from that browser; rotate the server key if it is exposed. Never place secrets in public code, URLs, logs, screenshots or documentation.

Deployment is separate for GitHub Pages and the Oracle service. Confirm current service health, actual proxy and firewall configuration, backups, migrations, CORS, authenticated and unauthenticated requests, and WhatsApp continuity in the target environment. The source checkout and older planning documents do not prove what is running. Obtain the repository-required separate approvals before any commit, push or server deployment.
