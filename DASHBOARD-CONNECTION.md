# Dashboard live-data connection: local implementation

This is a development version. It is not configured, published or connected to the Oracle VM. The live GitHub Pages site continues to use the earlier disconnected dashboard.

## Flow

The existing Strava watcher records visible runs in the local SQLite database. A new optional read-only route, `GET /dashboard/runs`, returns the recorded runner, date marker, metres and optional moving time. It returns no ingest/admin secrets or Strava activity IDs. The dashboard can poll that route every minute after the visitor enters a separate dashboard access key. The key stays in the page's memory only; reloading the page requires it again.

The response reports `coverage: unverified`, because the watcher cannot yet prove it has found every run. Responses are limited to 2,000 rows; if more are present the API reports truncation and the dashboard refuses to show partial totals. The local SQLite adapter adds a nullable moving-time column to an old database. Old durations remain unavailable until the watcher re-observes them; no history is invented.

## Local safeguards

- The route is disabled until both `DASHBOARD_READ_SECRET` and `DASHBOARD_ALLOWED_ORIGIN` are configured. The Node server rejects a short dashboard secret or one matching any existing service secret.
- The route requires an exact configured browser origin and a separate bearer secret. Origin checks are an additional restriction, not authentication.
- It accepts GET and a CORS preflight only, sets `Cache-Control: no-store`, and limits the response fields. Existing write/admin endpoints have separate credentials.
- `dashboard/config.js` contains only the candidate API URL, based on the last-known Oracle IP. The endpoint is not yet deployed or verified. Never put an access key or other secret in this public file. The client only accepts an HTTPS endpoint without embedded credentials, query or fragment, with the exact `/dashboard/runs` path. The browser rejects redirects and doesn't store the key persistently.
- Failed or incomplete data clears totals instead of presenting stale values as live.

## Still required before deployment

1. Agree whether both participants want private shared-key access or a different privacy model. A shared key is not individual identity, can be copied by either participant and does not control anyone who obtains it.
2. Provide a real HTTPS hostname and a narrowly configured reverse proxy or another secure transport. One no-purchase candidate is `150-230-126-166.sslip.io`, which resolved locally to the instance's last-known public IP. Its free third-party DNS and the instance's ephemeral IP can change; neither uptime nor TLS issuance has been verified. Caddy's automatic HTTPS needs ports 80 and 443 reachable. The current challenge service binds to localhost; do not expose all of it or its admin routes. Configure the proxy to expose only the read route, protect it against repeated authentication attempts and keep requests/headers with secrets out of logs. Do not put a bearer secret in a URL.
3. Decide how to handle free hosting and any account/domain requirements without assuming an extra paid subscription. Verify DNS, TLS, firewall and CORS in the actual environment.
4. Safely create a separate random key on the server, configure the allowed GitHub Pages origin, and set the public endpoint URL in `dashboard/config.js`. Do not copy key material into Git, chat or frontend source.
5. Test both authorized and unauthorized cross-origin requests over HTTPS, run-data accuracy, empty and stale states, rate limiting, restarts and WhatsApp continuity. Test with both runners' consent.
6. Review the exact Git repository, branch, server files, proxy changes and automatic deployment effects. Obtain separate user approval for commit, push, deployment and settings changes as required by workspace `AGENTS.md`.

The bot still only sees activities available to its Strava account and may miss runs, edits and deletions. An active timer and a successful page load do not prove full data coverage. This connection does not use the Strava API.
