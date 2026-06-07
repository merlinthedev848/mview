import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, WifiOff } from 'lucide-react';
import { apiUrl, go2rtcUrl } from '../lib/endpoints';

interface Camera {
  id: string;
  name: string;
  rtsp_url_main?: string;
  rtsp_url_sub?: string;
  status: string;
}

const WallboardCell: React.FC<{ cam: Camera; iceServers: RTCIceServer[] }> = ({ cam, iceServers }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [connected, setConnected] = useState(false);
  const streamName = cam.rtsp_url_sub ? `${cam.id}_sub` : cam.id;

  useEffect(() => {
    if (cam.status === 'offline' || !cam.rtsp_url_main) return;

    const pc = new RTCPeerConnection({ iceServers });
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    pc.ontrack = event => {
      if (videoRef.current && videoRef.current.srcObject !== event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        setConnected(true);
      }
    };

    (async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const response = await fetch(go2rtcUrl(`/api/webrtc?src=${encodeURIComponent(streamName)}`), {
          method: 'POST',
          body: offer.sdp,
        });
        if (response.ok) await pc.setRemoteDescription({ type: 'answer', sdp: await response.text() });
      } catch (err) {
        console.error('Wallboard WebRTC error', cam.id, err);
      }
    })();

    return () => {
      pc.close();
      setConnected(false);
    };
  }, [cam.id, cam.rtsp_url_main, streamName, JSON.stringify(iceServers)]);

  return (
    <div style={{ position: 'relative', background: '#02050a', overflow: 'hidden' }}>
      {cam.status === 'offline' || !cam.rtsp_url_main ? (
        <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#6b7b95', gap: 8 }}>
          <WifiOff size={28} />
          <span>{cam.name}</span>
        </div>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {!connected && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#7ea6d6' }}>
              Connecting...
            </div>
          )}
        </>
      )}
      <div style={{
        position: 'absolute',
        left: 10,
        top: 10,
        color: '#fff',
        fontWeight: 700,
        fontSize: 13,
        textShadow: '0 2px 8px #000',
      }}>
        {cam.name}
      </div>
      {cam.status === 'recording' && (
        <div style={{
          position: 'absolute',
          right: 10,
          top: 10,
          color: '#ff3b6b',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 1,
          textShadow: '0 2px 8px #000',
        }}>
          REC
        </div>
      )}
    </div>
  );
};

const Wallboard: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([]);

  useEffect(() => {
    if (!localStorage.getItem('mview_token')) {
      window.location.href = '/';
      return;
    }

    const load = async () => {
      try {
        const [cams, cfg] = await Promise.all([
          fetch(apiUrl('/cameras')).then(r => r.ok ? r.json() : []),
          fetch(apiUrl('/system/config')).then(r => r.ok ? r.json() : null),
        ]);
        setCameras(cams);
        const servers = cfg?.network?.ice_servers || [];
        setIceServers(servers.map((url: string) => ({ urls: url })));
      } catch {}
    };

    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);

  const columns = cameras.length <= 1 ? 1 : cameras.length <= 4 ? 2 : 3;

  if (cameras.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#07111e', color: '#7ea6d6', display: 'grid', placeItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <ShieldCheck size={22} />
          No cameras available
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#02050a',
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gridAutoRows: '1fr',
      gap: 2,
      overflow: 'hidden',
    }}>
      {cameras.map(cam => <WallboardCell key={cam.id} cam={cam} iceServers={iceServers} />)}
    </div>
  );
};

export default Wallboard;
