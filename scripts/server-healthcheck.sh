#!/usr/bin/env bash
# Run on the VPS: bash scripts/server-healthcheck.sh
# Prints the usual reasons Node BE dies on a 2c/4GB box.

set -euo pipefail

echo "=== CPU / RAM / disk ==="
free -h || true
df -h / || true
uptime || true

echo ""
echo "=== OOM kills (backend often dies here on 4GB) ==="
dmesg -T 2>/dev/null | grep -iE 'killed process|out of memory|oom' | tail -n 20 || \
  journalctl -k 2>/dev/null | grep -iE 'killed process|out of memory|oom' | tail -n 20 || \
  echo "(no OOM lines found or need sudo)"

echo ""
echo "=== Node / MySQL processes ==="
ps aux | grep -E 'node|mysqld|nginx|pm2' | grep -v grep || true

echo ""
echo "=== Listeners (expect 80/443 nginx, 5000 node, 3306 mysql) ==="
ss -lntp 2>/dev/null || netstat -lntp 2>/dev/null || true

echo ""
echo "=== PM2 (if used) ==="
command -v pm2 >/dev/null && pm2 status && pm2 logs --lines 40 --nostream || echo "pm2 not installed"

echo ""
echo "=== systemd node/eksathi (if used) ==="
systemctl list-units --type=service --all 2>/dev/null | grep -iE 'eksathi|node|api' || true

echo ""
echo "=== MySQL ping ==="
mysqladmin ping -h 127.0.0.1 2>/dev/null || echo "mysqladmin ping failed — check MySQL is up and .env DB*"

echo ""
echo "=== Required .env keys (names only) ==="
if [ -f .env ]; then
  grep -E '^(NODE_ENV|PORT|DBHOST|DBUSER|DBNAME|JWT_SECRET)=' .env | sed 's/=.*/=***/' || true
else
  echo "MISSING .env in $(pwd) — backend will crash or use wrong DB"
fi

echo ""
echo "Done. If OOM lines appear above: lower MySQL innodb_buffer_pool_size to 512M and run BE with pm2 + --max-old-space-size=1024"
