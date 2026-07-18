#!/usr/bin/env bash
set -euo pipefail

# Bootstrap Ubuntu/Debian server for no-Docker deployment.
# Usage:
#   bash tools/bootstrap-nodocker-server.sh

if [[ "${EUID}" -ne 0 ]]; then
  SUDO="sudo"
else
  SUDO=""
fi

$SUDO apt-get update -y
$SUDO apt-get install -y curl ca-certificates gnupg nginx certbot python3-certbot-nginx

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO bash -
  $SUDO apt-get install -y nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  $SUDO npm install -g pm2
fi

$SUDO mkdir -p /opt/mwangaza/releases
$SUDO mkdir -p /etc/mwangaza

if [[ ! -f /etc/mwangaza/api.env ]]; then
  cat <<'ENV' | $SUDO tee /etc/mwangaza/api.env >/dev/null
PORT=4000
REDISABLED=false
DATABASE_URL=postgresql://user:password@host.neon.tech:5432/neondb?sslmode=require
NEON_HOST=host.neon.tech
NEON_PORT=5432
NEON_DB=neondb
NEON_USER=user
NEON_PASSWORD=change-me
NEON_SSL=true
PUBLIC_BASE_URL=https://api.mysmartwork.tech
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_GRAPH_VERSION=v20.0
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
SHIPMENT_AI_PROVIDER=auto
ENV
  $SUDO chmod 600 /etc/mwangaza/api.env
fi

$SUDO systemctl enable nginx
$SUDO systemctl start nginx

echo "Bootstrap complete."
echo "Next: edit /etc/mwangaza/api.env with real secrets, then run tools/deploy-nodocker.ps1 from your local machine."
