#!/bin/bash

# mView Sentinel - One-Command Installer
# Usage: curl -sSL https://raw.githubusercontent.com/merlinthedev848/mview/main/install.sh | bash

set -e

echo -e "\033[1;36m=============================================================\033[0m"
echo -e "\033[1;36m  Deploying mView Sentinel — The Ultimate Linux NVR Server  \033[0m"
echo -e "\033[1;36m=============================================================\033[0m"

# 1. System Requirements Check & Auto-Install Docker
echo -e "\n\033[1;33m[1/5] Checking system dependencies...\033[0m"

if ! command -v git &> /dev/null; then
    echo "Git not found. Installing Git automatically..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -yq && apt-get install -yq git
fi

if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing Docker automatically..."
    export DEBIAN_FRONTEND=noninteractive
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "Docker installed successfully."
fi

# Ensure Docker Compose plugin is available
if ! docker compose version &> /dev/null; then
    echo "Docker Compose plugin not found. Attempting to install..."
    apt-get update -yq && apt-get install -yq docker-compose-plugin
fi

# 2. Clone Repository
echo -e "\n\033[1;33m[2/5] Fetching the latest version from GitHub...\033[0m"
INSTALL_DIR="/opt/mview-sentinel"
if [ -d "$INSTALL_DIR" ]; then
    echo "Directory $INSTALL_DIR already exists. Updating..."
    cd $INSTALL_DIR
    git fetch --all
    git reset --hard origin/main
    git clean -fd
else
    git clone https://github.com/merlinthedev848/mview.git $INSTALL_DIR
    cd $INSTALL_DIR
fi

# 3. Configure Hardware Acceleration
echo -e "\n\033[1;33m[3/5] Detecting hardware accelerators...\033[0m"
export GPU_COMPOSE=""
if command -v nvidia-smi &> /dev/null; then
    echo -e "\033[1;32m✓ NVIDIA GPU detected.\033[0m Enabling CUDA/TensorRT acceleration."
    # In the future, we'd append -f docker-compose.gpu.yml
else
    echo -e "\033[1;34mℹ No NVIDIA GPU detected.\033[0m Defaulting to OpenVINO / CPU."
fi

# 4. Setup Storage
echo -e "\n\033[1;33m[4/5] Setting up storage directories...\033[0m"
mkdir -p /mnt/storage/mview/recordings
mkdir -p /mnt/storage/mview/db
mkdir -p /mnt/storage/mview/redis
mkdir -p /mnt/storage/mview/mqtt
# Ensure the containers have permission to write to the storage
chmod -R 777 /mnt/storage/mview

# 5. Boot Services
echo -e "\n\033[1;33m[5/5] Starting mView Sentinel microservices...\033[0m"
if docker compose version &> /dev/null; then
    docker compose up -d
else
    docker-compose up -d
fi

echo -e "\n\033[1;32m=============================================================\033[0m"
echo -e "\033[1;32m  mView Sentinel is now running! 🚀\033[0m"
echo -e "\033[1;32m=============================================================\033[0m"
echo -e "Web Dashboard: http://localhost:5173"
echo -e "API Server:    http://localhost:8000"
echo -e "go2rtc Proxy:  http://localhost:1984"
echo -e "\n\033[1;37mTo view logs: cd $INSTALL_DIR && docker compose logs -f\033[0m"
