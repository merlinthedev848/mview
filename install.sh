#!/bin/bash

# mView Sentinel - One-Command Installer / Updater
# Usage: curl -sSL https://raw.githubusercontent.com/merlinthedev848/mview/main/install.sh | bash

set -e

random_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -hex 32
    else
        tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 48
    fi
}

ensure_env_value() {
    local key="$1"
    local value="$2"
    local file="$3"
    if ! grep -q "^${key}=" "$file" 2>/dev/null; then
        printf '%s=%s\n' "$key" "$value" >> "$file"
    fi
}

replace_env_value() {
    local key="$1"
    local value="$2"
    local file="$3"
    local tmp
    tmp="$(mktemp)"
    awk -v key="$key" -v value="$value" '
        BEGIN { found = 0 }
        $0 ~ "^" key "=" { print key "=" value; found = 1; next }
        { print }
        END { if (!found) print key "=" value }
    ' "$file" > "$tmp"
    cat "$tmp" > "$file"
    rm -f "$tmp"
}

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

if ! docker compose version &> /dev/null; then
    echo "ERROR: Docker Compose v2 is required. Install the docker-compose-plugin package and rerun this installer."
    exit 1
fi

COMPOSE=(docker compose)

if command -v docker-compose &> /dev/null; then
    LEGACY_COMPOSE_VERSION="$(docker-compose version --short 2>/dev/null || true)"
    if [ -n "$LEGACY_COMPOSE_VERSION" ]; then
        echo "Note: legacy docker-compose v${LEGACY_COMPOSE_VERSION} is installed, but this installer will use Docker Compose v2 via 'docker compose'."
        echo "If you previously ran 'docker-compose up' and saw KeyError: ContainerConfig, run:"
        echo "  docker compose down --remove-orphans && docker compose up -d --build"
    fi
fi

# ── 2. Clone / pull latest code ────────────────────────────────────
echo -e "\n\033[1;33m[2/6] Fetching latest code from GitHub...\033[0m"
INSTALL_DIR="/opt/mview-sentinel"

if [ -d "$INSTALL_DIR/.git" ]; then
    echo "Existing installation found — pulling updates..."
    cd "$INSTALL_DIR"
    git fetch --all
    git reset --hard origin/main
    # Keep sentinel.yml and .env during clean
    git clean -fd --exclude sentinel.yml --exclude .env
else
    git clone https://github.com/merlinthedev848/mview.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

echo -e "\n\033[1;33m[2b/6] Preparing installation secrets...\033[0m"
ENV_FILE="$INSTALL_DIR/.env"
NEW_ENV=0
if [ ! -f "$ENV_FILE" ]; then
    touch "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    NEW_ENV=1
fi

GENERATED_ADMIN_PASSWORD="$(random_secret | cut -c1-24)"
ensure_env_value "POSTGRES_USER" "sentinel" "$ENV_FILE"
ensure_env_value "POSTGRES_DB" "sentinelnvr" "$ENV_FILE"
ensure_env_value "POSTGRES_PASSWORD" "$(random_secret)" "$ENV_FILE"
ensure_env_value "MQTT_USERNAME" "sentinel" "$ENV_FILE"
ensure_env_value "MQTT_PASSWORD" "$(random_secret)" "$ENV_FILE"
ensure_env_value "SENTINEL_JWT_SECRET" "$(random_secret)" "$ENV_FILE"
ensure_env_value "ADMIN_PASSWORD" "$GENERATED_ADMIN_PASSWORD" "$ENV_FILE"
ensure_env_value "SENTINEL_CORS_ORIGINS" '["*"]' "$ENV_FILE"

if grep -Eq '^POSTGRES_PASSWORD=(sentinel)?$' "$ENV_FILE"; then
    replace_env_value "POSTGRES_PASSWORD" "$(random_secret)" "$ENV_FILE"
fi
if grep -Eq '^SENTINEL_JWT_SECRET=(CHANGE-ME-IN-PRODUCTION-USE-RANDOM-SECRET)?$' "$ENV_FILE"; then
    replace_env_value "SENTINEL_JWT_SECRET" "$(random_secret)" "$ENV_FILE"
fi
if grep -Eq '^ADMIN_PASSWORD=(admin)?$' "$ENV_FILE"; then
    replace_env_value "ADMIN_PASSWORD" "$GENERATED_ADMIN_PASSWORD" "$ENV_FILE"
    NEW_ENV=1
fi
chmod 600 "$ENV_FILE"

MQTT_USERNAME_VALUE="$(grep '^MQTT_USERNAME=' "$ENV_FILE" | cut -d= -f2-)"
MQTT_PASSWORD_VALUE="$(grep '^MQTT_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"
POSTGRES_USER_VALUE="$(grep '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2-)"
POSTGRES_DB_VALUE="$(grep '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2-)"
mkdir -p "$INSTALL_DIR/config"
docker run --rm \
    -v "$INSTALL_DIR/config:/mosquitto/config" \
    eclipse-mosquitto:2.1.2-alpine \
    mosquitto_passwd -b -c /mosquitto/config/passwords "$MQTT_USERNAME_VALUE" "$MQTT_PASSWORD_VALUE"
chmod 644 "$INSTALL_DIR/config/passwords"

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
DOCKER_BUILDKIT=1 "${COMPOSE[@]}" build --parallel

# ── 6. Start services in correct order ─────────────────────────────
echo -e "\n\033[1;33m[6/6] Starting services...\033[0m"

# Start infrastructure first and wait for healthy state
"${COMPOSE[@]}" up -d postgres redis mqtt go2rtc
echo "Waiting for database to be ready..."
POSTGRES_WAIT_SECONDS=0
until "${COMPOSE[@]}" exec -T postgres pg_isready -U "$POSTGRES_USER_VALUE" -d "$POSTGRES_DB_VALUE" &>/dev/null; do
    printf '.'
    POSTGRES_WAIT_SECONDS=$((POSTGRES_WAIT_SECONDS + 2))
    if [ "$POSTGRES_WAIT_SECONDS" -ge 240 ]; then
        echo ""
        echo "ERROR: PostgreSQL did not become ready after ${POSTGRES_WAIT_SECONDS}s."
        echo "Recent PostgreSQL logs:"
        "${COMPOSE[@]}" logs --tail=120 postgres || true
        exit 1
    fi
    sleep 2
done
echo ""
echo -e "\033[1;32m✓ PostgreSQL is ready.\033[0m"

# Now start the application services
"${COMPOSE[@]}" up -d

echo -e "\n\033[1;32m=============================================================\033[0m"
echo -e "\033[1;32m  mView Sentinel is running! 🚀\033[0m"
echo -e "\033[1;32m=============================================================\033[0m"
echo -e "  Web Dashboard:  http://$(hostname -I | awk '{print $1}'):8000"
echo -e "  API Health:     http://$(hostname -I | awk '{print $1}'):8000/system/health"
echo -e "  go2rtc:         http://$(hostname -I | awk '{print $1}'):1984"
if [ "$NEW_ENV" -eq 1 ]; then
    echo -e "  Initial login:  admin / $(grep '^ADMIN_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"
    echo -e "  Secrets file:   $ENV_FILE"
else
    echo -e "  Login:          existing admin credentials from $ENV_FILE"
fi
echo -e "\n\033[1;37mLogs:  cd $INSTALL_DIR && docker compose logs -f api\033[0m"
echo -e "\033[1;37mStop:  cd $INSTALL_DIR && docker compose down\033[0m"
