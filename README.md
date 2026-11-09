# Run or Pay

Private challenge prototype: Karolis 10 km/week, Lorenas 5 km/week, £50 per missed target; both failures cancel. The challenge runs 9 November to 31 December 2026, London time, with full targets for the final four-day week. The included cloud service is incomplete and has not been deployed.

Run `npm test` with Node.js installed. Inputs must already be verified qualifying activities for the same challenge week. The caller must manage dates, eligibility, corrections and verification; no integrations or storage are implemented.

Run `node src/preview.js examples/demo.json` to see a simulated report. The example verification flags are fictional and must never be treated as evidence for a real penalty. The report groups normalized activity start times by London calendar week, but does not validate their source or eligibility.

Outstanding before live use: agree activity eligibility, grace period and correction policy; verify both activity export pipelines and their terms, changes and deletions; choose and test a WhatsApp delivery method; implement secure hosting, scheduling, storage and failure alerts. Never assess a debt on incomplete data. Do not put credentials or health exports in this directory.

See [SETUP.md](SETUP.md) for the prototype interface, prerequisites and remaining work.
