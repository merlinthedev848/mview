"""
SentinelNVR Configuration Module.

Loads configuration from environment variables and an optional sentinel.yml file.
Environment variables take precedence over YAML values.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _load_yaml_config(path: str | None = None) -> dict[str, Any]:
    """Load configuration from a YAML file if it exists."""
    search_paths = [
        path,
        os.environ.get("SENTINEL_CONFIG_FILE"),
        "/etc/sentinel/sentinel.yml",
        "/opt/sentinel/sentinel.yml",
        str(Path.cwd() / "sentinel.yml"),
    ]
    for p in search_paths:
        if p and Path(p).is_file():
            with open(p, "r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh)
                return data if isinstance(data, dict) else {}
    return {}


class Settings(BaseSettings):
    """Application settings loaded from env vars, .env file, and sentinel.yml."""

    model_config = SettingsConfigDict(
        env_prefix="SENTINEL_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Core ────────────────────────────────────────────────────────────
    app_name: str = "SentinelNVR"
    app_version: str = "1.0.0"
    debug: bool = False
    log_level: str = "INFO"
    host: str = "0.0.0.0"
    port: int = 8080
    workers: int = 1

    # ── Database ────────────────────────────────────────────────────────
    database_url: str = Field(
        default="postgresql+asyncpg://sentinel:sentinel@localhost:5432/sentinel",
        description="Async SQLAlchemy database URL",
    )
    db_pool_size: int = 20
    db_max_overflow: int = 10
    db_echo: bool = False

    # ── Redis ───────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── MQTT ────────────────────────────────────────────────────────────
    mqtt_broker: str = "localhost"
    mqtt_port: int = 1883
    mqtt_username: str = ""
    mqtt_password: str = ""
    mqtt_client_id: str = "sentinel-api"

    # ── JWT / Auth ──────────────────────────────────────────────────────
    jwt_secret: str = Field(
        default="CHANGE-ME-IN-PRODUCTION-USE-RANDOM-SECRET",
        description="Secret key for JWT signing – MUST be changed in production.",
    )
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # ── Default Admin ───────────────────────────────────────────────────
    default_admin_username: str = "admin"
    default_admin_password: str = "admin"
    default_admin_email: str = "admin@sentinel.local"

    # ── Storage ─────────────────────────────────────────────────────────
    storage_path: str = "/opt/sentinel/recordings"
    thumbnail_path: str = "/opt/sentinel/thumbnails"
    snapshot_path: str = "/opt/sentinel/snapshots"
    export_path: str = "/opt/sentinel/exports"
    retention_days: int = 30

    # ── go2rtc ──────────────────────────────────────────────────────────
    go2rtc_url: str = "http://localhost:1984"
    go2rtc_config_path: str = "/etc/sentinel/go2rtc.yaml"

    # ── ONVIF / Discovery ───────────────────────────────────────────────
    onvif_timeout: int = 5
    discovery_timeout: int = 10
    rtsp_scan_timeout: int = 3
    default_onvif_port: int = 80

    # ── Notification Defaults ───────────────────────────────────────────
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = "sentinel@localhost"
    smtp_use_tls: bool = True

    # ── CORS ────────────────────────────────────────────────────────────
    cors_origins: list[str] = ["*"]

    # ── Camera YAML config (loaded from sentinel.yml) ───────────────────
    cameras_config: list[dict[str, Any]] = Field(default_factory=list)

    @field_validator("log_level")
    @classmethod
    def _upper_log_level(cls, v: str) -> str:
        return v.upper()

    def load_yaml_cameras(self) -> list[dict[str, Any]]:
        """Return camera definitions from sentinel.yml if present."""
        cfg = _load_yaml_config()
        return cfg.get("cameras", [])


# Singleton settings instance
settings = Settings()
