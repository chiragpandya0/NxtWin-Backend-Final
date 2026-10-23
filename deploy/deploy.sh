#!/usr/bin/env bash
# One-command deploy of the NxtWin backend + frontend on this server.
#
#   ./deploy/deploy.sh             pull, install, build and restart everything
#   ./deploy/deploy.sh backend     only the backend
#   ./deploy/deploy.sh frontend    only the frontend
#   ./deploy/deploy.sh setup       first-time setup (env, systemd, nginx, stops the old frontend), then deploys
#   ./deploy/deploy.sh admin       create or reset the admin account (asks for the password)
#   ./deploy/deploy.sh seed        add a demo gameweek of fixtures and markets
#   ./deploy/deploy.sh status      service state and health checks
#   ./deploy/deploy.sh logs [backend|frontend]
#
# Environment: DOMAIN (default below), NO_PULL=1 to skip git pull.
set -euo pipefail

DOMAIN="${DOMAIN:-probo.insightfusionanalytics.com}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENVF="$REPO/backend/.env"
APP_USER="$(id -un)"
NODE_BIN="$(command -v node || true)"
export NEXT_TELEMETRY_DISABLED=1

log()  { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31mxx %s\033[0m\n' "$*" >&2; exit 1; }

need_node() {
  [ -n "$NODE_BIN" ] || die "node not found in PATH"
  local major; major="$("$NODE_BIN" -p 'process.versions.node.split(".")[0]')"
  [ "$major" -ge 20 ] || die "Node 20+ required (found $("$NODE_BIN" -v))"
}

set_env() { # set_env KEY VALUE  (adds or replaces a line in backend/.env)
  if grep -q "^$1=" "$ENVF"; then sed -i "s|^$1=.*|$1=$2|" "$ENVF"; else echo "$1=$2" >> "$ENVF"; fi
}
get_env() { grep "^$1=" "$ENVF" 2>/dev/null | head -1 | cut -d= -f2- || true; }

wait_for() { # wait_for URL SECONDS
  local i; for i in $(seq 1 "$2"); do
    curl -fsS -o /dev/null -m 3 "$1" 2>/dev/null && return 0; sleep 1
  done; return 1
}

pull() {
  [ "${NO_PULL:-0}" = "1" ] && return 0
  log "Pulling latest code"
  git -C "$REPO" pull --ff-only
  git -C "$REPO" log --oneline -1
}

prepare_env() {
  log "Checking backend/.env"
  if [ ! -f "$ENVF" ]; then
    if [ -f "$REPO/.env" ]; then mv "$REPO/.env" "$ENVF"; warn "Moved the old .env into backend/"
    else cp "$REPO/backend/.env.example" "$ENVF"; die "Created backend/.env from the example. Fill in MONGODB_URI, then re-run."; fi
  fi
  case "$(get_env MONGODB_URI)" in ""|*USER:PASSWORD*) die "Set MONGODB_URI in backend/.env, then re-run." ;; esac
  [ -n "$(get_env JWT_SECRET)" ] || { set_env JWT_SECRET "$(openssl rand -hex 32)"; warn "Generated a JWT_SECRET"; }
  set_env CORS_ORIGIN "https://$DOMAIN"
  set_env PORT 5500
  chmod 600 "$ENVF"
}

stop_old_frontend() {
  log "Stopping any old frontend"
  sudo systemctl stop nxtwin-web 2>/dev/null || true
  if command -v pm2 >/dev/null 2>&1; then
    local names
    names="$(pm2 jlist 2>/dev/null | python3 -c '
import json,sys
try: apps=json.load(sys.stdin)
except Exception: apps=[]
for a in apps:
    blob=" ".join(str(a.get(k,"")) for k in ("name",)) + " " + " ".join(str(v) for v in a.get("pm2_env",{}).values() if isinstance(v,str))
    if "nxt" in blob.lower() or "next" in blob.lower(): print(a["name"])
' || true)"
    for n in $names; do warn "Removing pm2 app: $n"; pm2 delete "$n" || true; done
    [ -n "$names" ] && pm2 save >/dev/null 2>&1 || true
  fi
  if command -v docker >/dev/null 2>&1; then
    for c in $(sudo docker ps --filter publish=3000 -q 2>/dev/null || true); do warn "Stopping docker container $c (port 3000)"; sudo docker stop "$c" >/dev/null; done
  fi
  local pid unit
  pid="$(sudo ss -ltnp 'sport = :3000' 2>/dev/null | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2 || true)"
  if [ -n "$pid" ]; then
    unit="$(ps -o unit= -p "$pid" 2>/dev/null | tr -d ' ' || true)"
    warn "Port 3000 is held by pid $pid (systemd unit: ${unit:-none}); parent: $(ps -o ppid=,user=,args= -p "$(ps -o ppid= -p "$pid" | tr -d ' ')" 2>/dev/null | cut -c1-100)"
    case "$unit" in
      nxtwin-web.service|"") ;;
      *.service) warn "Disabling unit $unit so it does not restart the old frontend"; sudo systemctl disable --now "$unit" || true ;;
    esac
  fi
  if sudo ss -ltnp 'sport = :3000' 2>/dev/null | grep -q LISTEN; then
    warn "Something still listens on :3000, killing it:"; sudo ss -ltnp 'sport = :3000' | tail -n +2
    sudo fuser -k 3000/tcp 2>/dev/null || true; sleep 1
  fi
  local old="/home/$APP_USER/nxt-winn"
  if [ -d "$old" ]; then mv "$old" "$old.old-$(date +%F)"; warn "Renamed old checkout to $old.old-$(date +%F) (delete it when you are happy)"; fi
}

install_units() {
  log "Installing systemd units"
  for u in nxtwin nxtwin-web; do
    sed -e "s|@USER@|$APP_USER|g" -e "s|@REPO@|$REPO|g" -e "s|@NODE@|$NODE_BIN|g" "$REPO/deploy/$u.service" \
      | sudo tee "/etc/systemd/system/$u.service" >/dev/null
  done
  sudo systemctl daemon-reload
  sudo systemctl enable nxtwin nxtwin-web >/dev/null 2>&1
}

install_nginx() {
  log "Installing nginx site for $DOMAIN"
  sudo test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" || die "No certificate for $DOMAIN. Run: sudo certbot certonly --nginx -d $DOMAIN"
  local site=/etc/nginx/sites-available/probo
  [ -f "$site.bak" ] || { [ -f "$site" ] && sudo cp "$site" "$site.bak"; } || true
  # Disable any other enabled config for this domain or defining our upstreams (duplicates break nginx)
  local f
  for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do
    [ -e "$f" ] || [ -L "$f" ] || continue
    [ "$(basename "$f")" = "probo" ] && continue
    if sudo grep -qE "server_name[^;]*$DOMAIN|upstream nxtwin_" "$f" 2>/dev/null; then
      warn "Disabling conflicting nginx config: $f (moved to /etc/nginx/disabled-by-deploy/)"
      sudo mkdir -p /etc/nginx/disabled-by-deploy
      sudo mv "$f" "/etc/nginx/disabled-by-deploy/$(basename "$f").$(date +%s)"
    fi
  done
  sed "s|probo.insightfusionanalytics.com|$DOMAIN|g" "$REPO/deploy/nginx-probo.conf" | sudo tee "$site" >/dev/null
  sudo ln -sf "$site" /etc/nginx/sites-enabled/probo
  if sudo nginx -t 2>&1; then sudo systemctl reload nginx
  else
    [ -f "$site.bak" ] && sudo cp "$site.bak" "$site"
    die "nginx config test failed; restored the previous site file"
  fi
}

deploy_backend() {
  log "Backend: installing dependencies"
  (cd "$REPO/backend" && npm ci --omit=dev --no-audit --no-fund)
  log "Backend: restarting"
  sudo systemctl restart nxtwin
  wait_for http://127.0.0.1:5500/health 40 || { sudo journalctl -u nxtwin -n 25 --no-pager; die "Backend did not come up"; }
  echo "backend healthy: $(curl -s http://127.0.0.1:5500/health)"
}

deploy_frontend() {
  log "Frontend: installing dependencies and building (a minute or two)"
  (cd "$REPO/frontend" && npm ci --no-audit --no-fund && rm -rf .next && npm run build)
  log "Frontend: restarting"
  sudo systemctl restart nxtwin-web
  wait_for http://127.0.0.1:3000/ 40 || { sudo journalctl -u nxtwin-web -n 25 --no-pager; die "Frontend did not come up"; }
  # The page must reference CSS that actually exists (catches stale or half-built output)
  local css; css="$(curl -s http://127.0.0.1:3000/ | grep -o '/_next/static/css/[^"]*\.css' | head -1)"
  [ -n "$css" ] && curl -fsS -o /dev/null "http://127.0.0.1:3000$css" || die "Frontend stylesheet check failed ($css)"
  curl -fsS -o /dev/null http://127.0.0.1:3000/portfolio || die "Frontend is not serving the new pages"
  echo "frontend healthy (assets and pages OK)"
}

public_check() {
  log "Public checks (https://$DOMAIN)"
  curl -fsS -m 15 "https://$DOMAIN/health" && echo
  curl -fsS -m 15 -o /dev/null -w "site /bid: %{http_code}\n" "https://$DOMAIN/bid"
  curl -fsS -m 15 "https://$DOMAIN/api/markets" | head -c 100 && echo " ..."
}

status() {
  systemctl is-active nxtwin nxtwin-web || true
  curl -s -m 3 http://127.0.0.1:5500/health && echo
  curl -s -m 3 -o /dev/null -w "frontend: %{http_code}\n" http://127.0.0.1:3000/ || true
  git -C "$REPO" log --oneline -1
}

cmd="${1:-all}"
case "$cmd" in
  setup)    need_node; pull; prepare_env; stop_old_frontend; install_units; install_nginx; deploy_backend; deploy_frontend; public_check
            echo; echo "Next: ./deploy/deploy.sh admin   (create the admin login)   and   ./deploy/deploy.sh seed   (demo markets)";;
  all)      need_node; pull; prepare_env; deploy_backend; deploy_frontend; public_check;;
  backend)  need_node; pull; prepare_env; deploy_backend;;
  frontend) need_node; pull; deploy_frontend;;
  admin)    need_node
            read -rp "Admin email: " AE; read -rsp "Admin password (8+ chars): " AP; echo
            (cd "$REPO/backend" && ADMIN_EMAIL="$AE" ADMIN_PASSWORD="$AP" node scripts/create-admin.js)
            [ -n "$(get_env ADMIN_EMAIL)" ] && set_env ADMIN_EMAIL "$AE" || echo "ADMIN_EMAIL=$AE" >> "$ENVF";;
  seed)     need_node; (cd "$REPO/backend" && node scripts/seed-pl.js);;
  status)   status;;
  logs)     case "${2:-backend}" in frontend) sudo journalctl -u nxtwin-web -n 100 -f;; *) sudo journalctl -u nxtwin -n 100 -f;; esac;;
  *)        sed -n '2,13p' "$0"; exit 1;;
esac
