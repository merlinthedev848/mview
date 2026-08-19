FROM python:3.13-slim-bookworm
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    gcc \
    python3-dev \
    git \
    docker.io \
    curl \
    && curl -SL https://github.com/docker/compose/releases/download/v2.29.1/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose \
    && chmod +x /usr/local/bin/docker-compose \
    && mkdir -p /usr/libexec/docker/cli-plugins \
    && ln -s /usr/local/bin/docker-compose /usr/libexec/docker/cli-plugins/docker-compose \
    && apt-get purge -y --auto-remove curl \
    && rm -rf /var/lib/apt/lists/*

COPY api/requirements.txt ./api/
RUN pip install uv && uv pip install --system --no-cache -r api/requirements.txt

COPY api /app/api
COPY web/dist /app/web/dist

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
