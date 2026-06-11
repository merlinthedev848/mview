"""
ONVIF Discovery Service — WS-Discovery + IP range fallback scanner.

WS-Discovery (UDP multicast) often fails inside Docker bridge networking.
We implement two methods:
  1. WS-Discovery (fast, works on host network)
  2. Active IP range scan (reliable fallback — probes every host on the subnet)
"""

import asyncio
import logging
import ipaddress
import urllib.parse
from wsdiscovery.discovery import ThreadedWSDiscovery

logger = logging.getLogger("mView-ONVIF")

COMMON_ONVIF_PORTS = [80, 8080, 8000, 8899]


async def _probe_onvif(ip: str, port: int, timeout: float = 2.0) -> dict | None:
    """Try to connect to an ONVIF device_service endpoint and return its info."""
    url = f"http://{ip}:{port}/onvif/device_service"
    try:
        import httpx
        async with httpx.AsyncClient(timeout=timeout) as client:
            # A minimal GetDeviceInformation SOAP request
            soap = (
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"'
                ' xmlns:tds="http://www.onvif.org/ver10/device/wsdl">'
                '<s:Body><tds:GetDeviceInformation/></s:Body></s:Envelope>'
            )
            resp = await client.post(
                url,
                content=soap,
                headers={"Content-Type": "application/soap+xml"},
            )
            # Any 200/400/401 means something is listening on ONVIF
            if resp.status_code in (200, 400, 401, 500):
                return {
                    "id": f"{ip}:{port}",
                    "ip": ip,
                    "manufacturer": "Unknown",
                    "model": "IP Camera",
                    "onvif_endpoint": url,
                    "status": "online",
                }
    except Exception:
        pass
    return None


async def _scan_subnet(subnet: str, max_concurrent: int = 64) -> list[dict]:
    """Scan all hosts on a subnet for ONVIF devices."""
    try:
        network = ipaddress.IPv4Network(subnet, strict=False)
    except ValueError:
        return []

    hosts = list(network.hosts())
    if len(hosts) > 512:
        hosts = hosts[:512]  # Safety cap

    sem = asyncio.Semaphore(max_concurrent)
    results = []

    async def probe_host(ip_obj):
        ip = str(ip_obj)
        async with sem:
            for port in COMMON_ONVIF_PORTS:
                result = await _probe_onvif(ip, port)
                if result:
                    results.append(result)
                    return  # Found one, no need to check more ports

    await asyncio.gather(*[probe_host(h) for h in hosts])
    return results


def _get_local_subnets() -> list[str]:
    """Detect the local subnets the machine is on."""
    import socket
    import struct
    import os

    subnets = []
    try:
        import netifaces
        for iface in netifaces.interfaces():
            addrs = netifaces.ifaddresses(iface)
            if netifaces.AF_INET in addrs:
                for addr in addrs[netifaces.AF_INET]:
                    ip = addr.get('addr', '')
                    netmask = addr.get('netmask', '255.255.255.0')
                    if ip and not ip.startswith('127.'):
                        try:
                            network = ipaddress.IPv4Network(f"{ip}/{netmask}", strict=False)
                            subnets.append(str(network))
                        except Exception:
                            pass
    except ImportError:
        # Fallback: common home/office subnets
        subnets = ["192.168.1.0/24", "192.168.0.0/24", "10.0.0.0/24"]

    return subnets if subnets else ["192.168.1.0/24"]


async def discover_cameras(timeout: int = 5) -> list[dict]:
    """
    Discover ONVIF cameras using WS-Discovery first, then IP scan fallback.
    Returns a deduplicated list of discovered devices.
    """
    discovered: dict[str, dict] = {}

    # ── Method 1: WS-Discovery ───────────────────────────────────
    logger.info("Starting ONVIF WS-Discovery scan…")
    try:
        wsd = ThreadedWSDiscovery()
        wsd.start()
        await asyncio.sleep(timeout)
        services = wsd.searchServices()
        wsd.stop()

        for service in services:
            try:
                xaddrs = service.getXAddrs()
                if not xaddrs:
                    continue
                url = xaddrs[0]
                parsed = urllib.parse.urlparse(url)
                ip = parsed.hostname or "unknown"

                manufacturer = "Unknown"
                model = "Unknown"
                for scope in service.getScopes():
                    s = str(scope)
                    if "onvif://www.onvif.org/name/" in s:
                        manufacturer = urllib.parse.unquote(s.split("/")[-1])
                    elif "onvif://www.onvif.org/hardware/" in s:
                        model = urllib.parse.unquote(s.split("/")[-1])

                cam_id = str(service.getEPR()).replace("urn:uuid:", "")
                discovered[ip] = {
                    "id": cam_id,
                    "ip": ip,
                    "manufacturer": manufacturer,
                    "model": model,
                    "onvif_endpoint": url,
                    "status": "online",
                }
            except Exception as e:
                logger.debug(f"WS-Discovery parse error: {e}")

        logger.info(f"WS-Discovery found {len(discovered)} device(s).")
    except Exception as e:
        logger.warning(f"WS-Discovery failed: {e}. Falling back to IP scan.")

    # ── Method 2: IP Range Scan (fallback if WS-Discovery found nothing) ──
    if not discovered:
        logger.info("No WS-Discovery results. Starting active IP range scan…")
        subnets = _get_local_subnets()
        logger.info(f"Scanning subnets: {subnets}")
        for subnet in subnets:
            results = await _scan_subnet(subnet)
            for r in results:
                if r["ip"] not in discovered:
                    discovered[r["ip"]] = r

        logger.info(f"IP scan found {len(discovered)} device(s).")

    return list(discovered.values())


class ONVIFService:
    """Legacy wrapper kept for compatibility with cameras.py router."""

    async def discover_cameras(self, timeout: int = 5) -> list[dict]:
        return await discover_cameras(timeout)

    def get_camera_streams(self, ip, port, username, password) -> list | None:
        """Probe a camera for its RTSP stream URIs via ONVIF Profile S."""
        try:
            from onvif import ONVIFCamera
            import os
            wsdl_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'wsdl')
            mycam = ONVIFCamera(ip, port, username, password, wsdl_dir=wsdl_dir)
            media = mycam.create_media_service()
            profiles = media.GetProfiles()
            streams = []
            for profile in profiles:
                try:
                    obj = media.create_type('GetStreamUri')
                    obj.ProfileToken = profile.token
                    obj.StreamSetup = {'Stream': 'RTP-Unicast', 'Transport': {'Protocol': 'RTSP'}}
                    uri = media.GetStreamUri(obj)
                    res = getattr(getattr(profile, 'VideoEncoderConfiguration', None), 'Resolution', None)
                    streams.append({
                        "profile_name": profile.Name,
                        "resolution": f"{res.Width}x{res.Height}" if res else "Unknown",
                        "rtsp_url": uri.Uri,
                    })
                except Exception as e:
                    logger.warning(f"Stream probe error for profile {profile.Name}: {e}")
            return streams
        except Exception as e:
            logger.error(f"ONVIF connect failed for {ip}: {e}")
            return None


onvif_service = ONVIFService()
