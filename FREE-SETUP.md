# Zero-cost setup investigation

Budget: £0. Do not subscribe to Health Auto Export, upgrade Oracle to paid, or create billable resources. A complete zero-cost unattended path is not verified yet.

## iPhone data

Strava workouts now appear in Apple Health. HealthSync is an open-source free iOS app that supports sending workouts and deletions to a self-hosted API in the background, subject to iOS scheduling. The prototype includes a HealthSync v2 endpoint. The actual source name, payload, synchronization frequency, deletion behavior and UK availability remain to be tested on Karolis's phone. No actual deployment or phone test has been performed.

HealthSync documentation: https://healthysync.app/support and https://github.com/megabyte0x/healthysync. Select only the required data; do not use a third-party health-data test endpoint.

## Cloud server candidate

Oracle Cloud's Always Free VM could run Node.js and a Chromium-based WhatsApp bridge with persistent storage, subject to available capacity and compatible Chromium. Account signup generally requires card verification, and availability and continued operation are not guaranteed. Remain on the free account and explicitly use only Always Free eligible resources. No Oracle server has been provisioned or deployed, and this project currently targets Cloudflare Workers plus a separate Node WhatsApp process; it is not yet an Oracle-ready single-server application.

## Remaining requirements

- Validate free data export for both phones and source terms; confirm uploads, corrections and missing-sync detection.
- Android: Life Dashboard Companion can export Health Connect exercise and distance as separate records. `src/android-distance.js` only experiments with matching same-source intervals; it is not wired to ingestion. Incremental batches, overlapping samples, deletion and record completeness must be solved before it can be used. https://github.com/owen282000/life-dashboard-companion-app/blob/main/docs/webhook.md
- Adapt and test the server for the chosen free host; secure secrets, persistent session files, network access, health data and backups.
- Test the unofficial WhatsApp QR connection and message delivery in an agreed test group. Account restriction, re-linking and duplicated messages remain possible.
- Implement safe week verification, finalization, corrections and alerting; do not assess real penalties from unverified data.
- Provision and deploy only after separate explicit deployment confirmation under the workspace rules.
