#!/bin/bash

# mView Sentinel - One-Command Installer / Updater
# Usage: curl -sSL https://raw.githubusercontent.com/merlinthedev848/mview/main/install.sh | bash

set -e

echo -e "\033[1;36m=============================================================\033[0m"
echo -e "\033[1;36m   mView Sentinel NVR — Installer / Updater                 \033[0m"
echo -e "\033[1;36m=============================================================\033[0m"

# ── 1. System dependencies ─────────────────────────────────────────
echo -e "\n\033[1;33m[1/5] Checking system dependencies...\033[0m"

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
echo -e "\n\033[1;33m[2/5] Fetching latest code from GitHub...\033[0m"
INSTALL_DIR="/opt/mview-sentinel"

if [ -d "$INSTALL_DIR" ]; then
    echo "Existing installation found — pulling updates..."
    cd $INSTALL_DIR
    git fetch --all
    git reset --hard origin/main
    git clean -fd
else
    git clone https://github.com/merlinthedev848/mview.git $INSTALL_DIR
    cd $INSTALL_DIR
fi

# ── 3. Hardware detection ──────────────────────────────────────────
echo -e "\n\033[1;33m[3/5] Detecting hardware...\033[0m"
if command -v nvidia-smi &> /dev/null; then
    echo -e "\033[1;32m✓ NVIDIA GPU detected.\033[0m"
else
    echo -e "\033[1;34mℹ No GPU detected — using CPU mode.\033[0m"
fi

# ── 4. Storage directories ─────────────────────────────────────────
echo -e "\n\033[1;33m[4/5] Preparing storage directories...\033[0m"
mkdir -p /mnt/storage/mview/recordings
mkdir -p /mnt/storage/mview/db
mkdir -p /mnt/storage/mview/redis
chmod -R 777 /mnt/storage/mview

# ── 5. Build & start ───────────────────────────────────────────────
echo -e "\n\033[1;33m[5/5] Building images and starting services...\033[0m"
echo "(This compiles the React frontend inside Docker — takes ~2 minutes on first run)"

# Always rebuild so code changes take effect
if docker compose version &> /dev/null; then
    docker compose up -d --build
else
    docker-compose up -d --build
fi

echo -e "\n\033[1;32m=============================================================\033[0m"
echo -e "\033[1;32m  mView Sentinel is running! 🚀\033[0m"
echo -e "\033[1;32m=============================================================\033[0m"
echo -e "  Web Dashboard:  http://$(hostname -I | awk '{print $1}'):8000"
echo -e "  API:            http://$(hostname -I | awk '{print $1}'):8000"
echo -e "  go2rtc:         http://$(hostname -I | awk '{print $1}'):1984"
echo -e "\n\033[1;37mLogs: cd $INSTALL_DIR && docker compose logs -f api\033[0m"
echo -e "\033[1;37mStop: cd $INSTALL_DIR && docker compose down\033[0m"
