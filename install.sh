#!/bin/bash

# mView Sentinel - One-Command Installer / Updater
# Usage: curl -sSL https://raw.githubusercontent.com/merlinthedev848/mview/main/install.sh | bash

set -e

echo -e "\033[1;36m=============================================================\033[0m"
echo -e "\033[1;36m   mView Sentinel NVR — Installer / Updater                 \033[0m"
echo -e "\033[1;36m=============================================================\033[0m"

# ── 1. System dependencies ─────────────────────────────────────────
echo -e "\n\033[1;33m[1/6] Checking system dependencies...\033[0m"

if ! command -v git &> /dev/null; then
    echo "Git not found. Installing..."
    apt-get update -yq && apt-get install -yq git
fi

if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh && rm get-docker.sh
    echo "Docker installed."
fi

if ! docker compose version &> /dev/null; then
    echo "Docker Compose plugin not found. Installing..."
    apt-get update -yq && apt-get install -yq docker-compose-plugin
fi

# ── 2. Clone / pull latest code ────────────────────────────────────
echo -e "\n\033[1;33m[2/6] Fetching latest code from GitHub...\033[0m"
INSTALL_DIR="/opt/mview-sentinel"

if [ -d "$INSTALL_DIR/.git" ]; then
    echo "Existing installation found — pulling updates..."
    cd $INSTALL_DIR
    git fetch --all
    git reset --hard origin/main
    # Keep sentinel.yml and .env during clean
    git clean -fd --exclude sentinel.yml --exclude .env
else
    git clone https://github.com/merlinthedev848/mview.git $INSTALL_DIR
    cd $INSTALL_DIR
fi

# ── 3. Hardware detection ──────────────────────────────────────────
echo -e "\n\033[1;33m[3/6] Detecting hardware...\033[0m"
if command -v nvidia-smi &> /dev/null; then
    echo -e "\033[1;32m✓ NVIDIA GPU detected.\033[0m"
else
    echo -e "\033[1;34mℹ No GPU detected — using CPU mode.\033[0m"
fi

# ── 4. Storage directories ─────────────────────────────────────────
echo -e "\n\033[1;33m[4/6] Preparing storage directories...\033[0m"
mkdir -p /mnt/storage/mview/recordings
mkdir -p /mnt/storage/mview/db
mkdir -p /mnt/storage/mview/redis
mkdir -p /opt/sentinel/thumbnails
mkdir -p /opt/sentinel/snapshots
mkdir -p /opt/sentinel/exports
chmod -R 755 /mnt/storage/mview
chmod -R 755 /opt/sentinel

# ── 5. Build images ─────────────────────────────────────────────────
echo -e "\n\033[1;33m[5/6] Building Docker images (uses cached layers — fast!)...\033[0m"
docker compose build

# ── 6. Start services in correct order ─────────────────────────────
echo -e "\n\033[1;33m[6/6] Starting services...\033[0m"

# Start infrastructure first and wait for healthy state
docker compose up -d postgres redis mqtt go2rtc
echo "Waiting for database to be ready..."
until docker compose exec -T postgres pg_isready -U sentinel -d sentinelnvr &>/dev/null; do
    printf '.'
    sleep 2
done
echo ""
echo -e "\033[1;32m✓ PostgreSQL is ready.\033[0m"

# Now start the application services
docker compose up -d

echo -e "\n\033[1;32m=============================================================\033[0m"
echo -e "\033[1;32m  mView Sentinel is running! 🚀\033[0m"
echo -e "\033[1;32m=============================================================\033[0m"
echo -e "  Web Dashboard:  http://$(hostname -I | awk '{print $1}'):8000"
echo -e "  API Health:     http://$(hostname -I | awk '{print $1}'):8000/system/health"
echo -e "  go2rtc:         http://$(hostname -I | awk '{print $1}'):1984"
echo -e "  Default login:  admin / admin"
echo -e "\n\033[1;37mLogs:  cd $INSTALL_DIR && docker compose logs -f api\033[0m"
echo -e "\033[1;37mStop:  cd $INSTALL_DIR && docker compose down\033[0m"
