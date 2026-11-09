# WhatsApp bridge (experimental)

This is an unofficial WhatsApp Web client, not Meta's official API. It can be disconnected or restricted. The linked account's session grants access to its WhatsApp account; protect it like a password. A personal account may be affected. Use only a group whose participants consent to receiving the messages. Never share QR codes, session files, API secrets or account details.

This bridge is not hosted or linked yet. It requires a persistent Node.js process with a supported Chromium installation and persistent encrypted/private storage for the WhatsApp session. A Cloudflare Worker alone cannot run this browser process. A free always-on host and its policies, storage and costs have not been selected or verified.

After the challenge service has been deployed and verified, install dependencies with `npm install`. Set `LIST_GROUPS=1` and run `npm start`, scan the QR from WhatsApp's Linked devices, then identify the intended group's ID from the output. Set `CHALLENGE_URL` (HTTPS, or HTTP on localhost), `ADMIN_SECRET` and `WHATSAPP_GROUP_ID` as secure environment variables on the host, remove `LIST_GROUPS`, and start the process. With these variables configured, the bridge immediately sends queued messages to the group.

Use a dedicated test group first. Never run more than one bridge instance against the same queue: it has no cross-process lock. A message can be delivered twice if the client crashes or the acknowledgement fails after sending; delivery confirmation and automatic reconnection are not guaranteed. An empty queue does not verify the data source. Do not enable real penalty messages until the complete workflow has been tested and the source-data terms and participants' consent have been addressed.
