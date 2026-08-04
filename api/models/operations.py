import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, JSON, String

from api.database import Base


class NVRConnection(Base):
    __tablename__ = "nvr_connections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    vendor = Column(String, nullable=False, default="generic")
    host = Column(String, nullable=False)
    port = Column(String, nullable=False, default="554")
    username = Column(String, nullable=True)
    password = Column(String, nullable=True)
    enabled = Column(Boolean, default=True)
    status = Column(String, default="configured", index=True)
    config = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    enabled = Column(Boolean, default=True)
    severity = Column(String, default="medium")
    config = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PrivacyMode(Base):
    __tablename__ = "privacy_modes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    enabled = Column(Boolean, default=False)
    config = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EventReview(Base):
    __tablename__ = "event_reviews"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String, nullable=False, unique=True, index=True)
    verdict = Column(String, nullable=False, default="unreviewed")
    note = Column(String, nullable=True)
    config = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class IncidentCase(Base):
    __tablename__ = "incident_cases"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    status = Column(String, nullable=False, default="open", index=True)
    severity = Column(String, nullable=False, default="medium", index=True)
    assigned_to = Column(String, nullable=True)
    config = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EvidencePackage(Base):
    __tablename__ = "evidence_packages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    package_hash = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default="manifest_ready", index=True)
    config = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class StoragePolicy(Base):
    __tablename__ = "storage_policies"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    enabled = Column(Boolean, default=True)
    config = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class IntegrationEndpoint(Base):
    __tablename__ = "integration_endpoints"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    kind = Column(String, nullable=False, default="webhook")
    enabled = Column(Boolean, default=True)
    config = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SiteNode(Base):
    __tablename__ = "site_nodes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="recorder")
    endpoint = Column(String, nullable=False, default="")
    status = Column(String, nullable=False, default="configured", index=True)
    config = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
