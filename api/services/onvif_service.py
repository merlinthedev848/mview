import logging
import asyncio
from wsdiscovery.discovery import ThreadedWSDiscovery
from onvif import ONVIFCamera
import os

logger = logging.getLogger("mView-ONVIF")

class ONVIFService:
    """
    Handles WS-Discovery to find local IP Cameras, and uses onvif-zeep 
    to extract their RTSP capabilities and PTZ commands.
    """
    def __init__(self):
        self.wsdl_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'wsdl')
        
    async def discover_cameras(self, timeout=5):
        """
        Broadcasts WS-Discovery UDP packets and parses the responses.
        Returns a list of discovered ONVIF endpoint URLs.
        """
        logger.info(f"Starting ONVIF WS-Discovery scan (timeout={timeout}s)...")
        wsd = ThreadedWSDiscovery()
        wsd.start()
        
        # Give it time to receive UDP responses
        await asyncio.sleep(timeout)
        
        services = wsd.searchServices()
        wsd.stop()
        
        discovered = []
        for service in services:
            try:
                # Filter for ONVIF NetworkVideoTransmitter (NVT)
                types = [t.lower() for t in service.getTypes()]
                if any('networkvideotransmitter' in t or 'device' in t for t in types):
                    xaddrs = service.getXAddrs()
                    if xaddrs:
                        # Grab the first address
                        url = xaddrs[0]
                        discovered.append({
                            "uuid": service.getEPR(),
                            "url": url,
                            "scopes": service.getScopes()
                        })
            except Exception as e:
                logger.error(f"Error parsing WS-Discovery service: {e}")
                
        logger.info(f"Discovery complete. Found {len(discovered)} ONVIF devices.")
        return discovered

    def get_camera_streams(self, ip, port, username, password):
        """
        Connects to a camera via ONVIF Profile S and extracts the RTSP URIs.
        """
        try:
            # We must use Zeep's asynchronous bindings or run this in a threadpool in FastAPI
            mycam = ONVIFCamera(ip, port, username, password, wsdl_dir=self.wsdl_dir)
            media_service = mycam.create_media_service()
            profiles = media_service.GetProfiles()
            
            streams = []
            for profile in profiles:
                try:
                    # Get RTSP Stream URI for each profile (Main, Sub)
                    obj = media_service.create_type('GetStreamUri')
                    obj.ProfileToken = profile.token
                    obj.StreamSetup = {
                        'Stream': 'RTP-Unicast',
                        'Transport': {'Protocol': 'RTSP'}
                    }
                    uri = media_service.GetStreamUri(obj)
                    streams.append({
                        "profile_name": profile.Name,
                        "resolution": f"{profile.VideoEncoderConfiguration.Resolution.Width}x{profile.VideoEncoderConfiguration.Resolution.Height}",
                        "rtsp_url": uri.Uri
                    })
                except Exception as e:
                    logger.warning(f"Failed to get stream for profile {profile.Name}: {e}")
                    
            return streams
        except Exception as e:
            logger.error(f"Failed to connect to ONVIF camera {ip}: {e}")
            return None

onvif_service = ONVIFService()
