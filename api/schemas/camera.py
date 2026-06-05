from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime

class CameraBase(BaseModel):
    name: str
    rtsp_url_main: Optional[str] = None
    rtsp_url_sub: Optional[str] = None
    onvif_endpoint: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    resolution: Optional[str] = None
    enabled: bool = True
    config: Optional[Dict[str, Any]] = None

class CameraCreate(CameraBase):
    onvif_username: Optional[str] = None
    onvif_password: Optional[str] = None
    auto_adopted: bool = False

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    enabled: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None
    status: Optional[str] = None

class CameraResponse(CameraBase):
    id: str
    status: str
    auto_adopted: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ONVIFDiscoveryResult(BaseModel):
    id: str
    ip: str
    manufacturer: str
    model: str
    onvif_endpoint: str
    status: str
