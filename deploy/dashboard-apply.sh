#!/usr/bin/env bash
# Deployment helper for the existing opc test installation. Review and obtain
# explicit approval before execution; it changes services, files and packages.
set -euo pipefail
if [[ ${1:-} != --apply ]]; then
  printf '%s\n' 'Review this script; run only after specific deployment approval with --apply.'
  exit 2
fi
if [[ $(id -un) != opc ]]; then echo 'Run as the existing opc user.' >&2; exit 1; fi
base=/home/opc/run-or-pay-test
bundle=/home/opc/run-or-pay-dashboard-server-update.tar.gz
[[ -f "$bundle" && -f "$base/.test-env" && -f "$base/run-or-pay.sqlite" ]] || { echo 'Required bundle, environment or database is missing.' >&2; exit 1; }
if command -v caddy >/dev/null 2>&1 || ss -ltn '( sport = :80 or sport = :443 )' | grep -q LISTEN; then
  echo 'Caddy is already installed or a web port is occupied; inspect manually.' >&2; exit 1
fi
if [[ -e "$base/.dashboard-env" || -e "$HOME/.config/systemd/user/run-or-pay.service.d/dashboard.conf" ]]; then
  echo 'Dashboard settings already exist; inspect manually rather than replacing them.' >&2; exit 1
fi
work=$(mktemp -d)
paused=0
cleanup() {
  if [[ $paused == 1 ]]; then
    echo 'Deployment stopped early; attempting to restart the bot services.' >&2
    systemctl --user start run-or-pay.service run-or-pay-whatsapp.service run-or-pay-strava.timer || true
  fi
  rm -rf "$work"
}
trap cleanup EXIT
tar -xzf "$bundle" -C "$work"
for file in src/server.js src/worker.js src/sqlite-binding.js schema.sql deploy/dashboard.Caddyfile; do [[ -f "$work/$file" ]] || { echo "Missing $file in bundle" >&2; exit 1; }; done

# Install Caddy before pausing the bot. This enables the official Caddy COPR
# repository and installs system packages; it requires network and sudo.
sudo dnf install -y dnf-plugins-core
sudo dnf copr enable -y @caddy/caddy
sudo dnf install -y caddy
caddy validate --config "$work/deploy/dashboard.Caddyfile" --adapter caddyfile

# Pause all components before a consistent SQLite backup and schema migration.
paused=1
systemctl --user stop run-or-pay-strava.timer run-or-pay-strava.service
systemctl --user stop run-or-pay-whatsapp.service run-or-pay.service
mkdir -p "$base/backups"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_dir="$base/backups/dashboard-$stamp"
mkdir -m 700 "$backup_dir"
cp "$base/src/server.js" "$base/src/worker.js" "$base/src/sqlite-binding.js" "$base/schema.sql" "$backup_dir/"
node --input-type=module - "$base/run-or-pay.sqlite" "$backup_dir/run-or-pay.sqlite" <<'NODE'
import {DatabaseSync,backup} from 'node:sqlite';
const db = new DatabaseSync(process.argv[2], {readOnly:true});
try { await backup(db,process.argv[3]); } finally { db.close(); }
NODE

# A randomly generated shared read key is stored only on the VM. The browser
# origin is public configuration, not an authentication credential.
umask 077
node - "$base/.dashboard-env" <<'NODE'
const fs=require('node:fs'), crypto=require('node:crypto');
const value=crypto.randomBytes(32).toString('hex');
fs.writeFileSync(process.argv[2],`DASHBOARD_READ_SECRET=${value}\nDASHBOARD_ALLOWED_ORIGIN=https://karolis-zak.github.io\n`,{mode:0o600,flag:'wx'});
NODE
mkdir -p "$HOME/.config/systemd/user/run-or-pay.service.d"
cat > "$HOME/.config/systemd/user/run-or-pay.service.d/dashboard.conf" <<'UNIT'
[Service]
EnvironmentFile=/home/opc/run-or-pay-test/.dashboard-env
UNIT
chmod 600 "$HOME/.config/systemd/user/run-or-pay.service.d/dashboard.conf"
install -m 644 "$work/src/server.js" "$work/src/worker.js" "$work/src/sqlite-binding.js" "$base/src/"
install -m 644 "$work/schema.sql" "$base/schema.sql"
systemctl --user daemon-reload
systemctl --user start run-or-pay.service
systemctl --user is-active --quiet run-or-pay.service
curl -fsS http://127.0.0.1:8787/health >/dev/null
systemctl --user start run-or-pay-whatsapp.service run-or-pay-strava.timer
paused=0

# The configuration publishes only the read route. It requires Oracle ingress
# and host firewall access on ports 80/443; this script does not change them.
if sudo test -f /etc/caddy/Caddyfile; then sudo cp -p /etc/caddy/Caddyfile "$backup_dir/Caddyfile.before"; fi
sudo install -m 644 "$work/deploy/dashboard.Caddyfile" /etc/caddy/Caddyfile
sudo systemctl enable --now caddy
echo "Server files updated. Backup: $backup_dir"
echo 'Check TLS and firewall access before publishing the dashboard.'
echo 'The access key stays in .dashboard-env; do not send that file or key in chat.'
