# Cloud prototype setup and remaining work

This is an incomplete, non-live prototype, not an end-to-end WhatsApp or Health integration. It does not automatically verify sources, deliver messages, settle debts, or finalize weeks. Do not use it to assess real penalties. `/report` deliberately reports both participants as unverified.

## Local preparation

Requires Node.js and a Cloudflare account and Wrangler when the service is eventually deployed. Run `npm test` and `node src/preview.js examples/demo.json`. The scoring examples contain fictional data only.

The Worker expects a Cloudflare D1 binding named `DB`, with `schema.sql` applied, and three independent long random secrets: `ADMIN_SECRET`, `KAROLIS_INGEST_SECRET`, and `LORENAS_INGEST_SECRET`. Supply secrets through the hosting platform's secret facility; do not commit them. Replace the placeholder database ID in `wrangler.jsonc` only after creating the database. Deployment and provisioning require the user's separate explicit confirmation under the workspace rules.

## Prototype HTTP contract

`GET /health` is public and returns availability only. Each `POST /ingest/Karolis` or `/ingest/Lorenas` requires that runner's bearer secret and a JSON object containing a stable string `id`, `startedAt` as an ISO 8601 timestamp with timezone, and integer `metres`. Resending the same ID updates rather than duplicates it. Only an adapter that has verified runner, eligible run type, source and distance should call it. It does not accept a raw Health Auto Export or Health Sync payload.

`DELETE /ingest/Karolis?id=...` (or Lorenas) with the participant's secret removes a record. It does not automatically detect a deletion upstream. A real adapter must reconcile updates and deletions and authenticate them safely.

`GET /report?at=2026-11-10T12:00:00Z` and `GET /notifications` require the admin bearer secret. An authorized external delivery process can mark a notification sent using `POST /notifications/ack` with JSON `{"id":"..."}`. Reports remain unverified, and messages are queued in the database only. The scheduler queues a Monday welcome and generic Friday/Sunday reminders; delivery, retries and monitoring are not implemented. No notifications are sent to WhatsApp or anywhere else. Concurrent delivery can duplicate messages; acknowledgements are not a transactional delivery guarantee.

`POST /health-export/karolis` accepts documented Health Auto Export v2 JSON using Karolis's bearer secret and converts km, metres and miles. It is experimental and untested with an actual export. Unknown units and missing fields are rejected; the parser does not establish that a workout was recorded in Strava, distinguish manually recorded runs or detect deletions. It must not be used for real scoring until source identity, terms and reconciliation have been resolved.

## Required before actual use

1. Check a newly saved Strava run appears in Apple Health with the correct workout, time and distance. Investigate automatic export, pricing, payload, retry and deletion behavior. Do the equivalent on Lorenas's Android later.
2. Confirm the permission and privacy terms applicable to onward use of workout data, including each export app. Minimize data and restrict access; current prototype retains received distances until deleted and has no retention or privacy workflow.
3. Select an eligible WhatsApp delivery method and establish costs and reliability. No WhatsApp account or Facebook account is connected by this prototype.
4. Implement authenticated source-specific adapters, reconciliation, sync freshness/verification, finalization, correction messages, notification delivery and retries, retention and consent withdrawal, monitoring and backups. Agree qualifying activity types, grace period and exceptions.
5. Test with actual authorized data in a no-penalty trial. Only after verification should debts be calculated. Human action may be needed for reconnection and settlement.

Cloud hosting makes the service internet-reachable and entrusts its provider with the data and secrets. Keep `/health` free of personal information and restrict the API secrets to their intended holder.
