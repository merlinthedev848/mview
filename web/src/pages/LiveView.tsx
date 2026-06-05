import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, Mic, Camera as CamIcon, WifiOff, Focus } from 'lucide-react';

const API = () => `http://${window.location.hostname}:8000`;

interface CameraFeedProps { cam: any }

const CameraFeed: React.FC<CameraFeedProps> = ({ cam }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [connected, setConnected] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (cam.status === 'offline' || !cam.rtsp_url_main) return;

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    pc.ontrack = e => {
      if (videoRef.current && videoRef.current.srcObject !== e.streams[0]) {
        videoRef.current.srcObject = e.streams[0];
        setConnected(true);
      }
    };

    (async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const res = await fetch(
          `http://${window.location.hostname}:1984/api/webrtc?src=${encodeURIComponent(cam.id)}`,
          { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: offer.sdp }
        );
        if (res.ok) await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() });
      } catch (e) { console.error('[WebRTC]', cam.name, e); }
    })();

    return () => { pc.close(); setConnected(false); };
  }, [cam.id, cam.status, cam.rtsp_url_main]);

  const isOffline = cam.status === 'offline';

  return (
    <div
      className={`cam-cell${cam.has_motion ? ' has-motion' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top overlay */}
      <div className="cam-top">
        <div>
          <div className="cam-name">{cam.name}</div>
          {cam.location && <div className="cam-sub">{cam.location}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {cam.status === 'recording' && (
            <div className="cam-rec"><div className="cam-rec-dot" /> REC</div>
          )}
          <button className="cam-more">···</button>
        </div>
      </div>

      {/* Video or placeholder */}
      {isOffline || !cam.rtsp_url_main ? (
        <div className="cam-placeholder">
          <WifiOff size={26} strokeWidth={1.5} />
          <span>{isOffline ? 'Camera Offline' : 'No Stream URL'}</span>
        </div>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline muted />
          {!connected && (
            <div className="cam-connecting">
              <div className="spinner" />
              <span style={{ fontSize: '0.72rem', color: 'var(--t3)' }}>Connecting…</span>
            </div>
          )}
        </>
      )}

      {/* Bottom controls */}
      <div className="cam-bottom">
        <button className="cam-btn" title="Focus"><Focus size={12} /></button>
        <button className="cam-btn" title="Audio"><Mic size={12} /></button>
        <button className="cam-btn" title="Snapshot"><CamIcon size={12} /></button>
        <button className="cam-btn" title="Fullscreen"><Maximize2 size={12} /></button>
        {connected && <span className="cam-info">WebRTC · Live</span>}
      </div>
    </div>
  );
};

// ── LiveView page ─────────────────────────────────────────────────
const LiveView: React.FC = () => {
  const [cameras, setCameras] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [layout, setLayout] = useState<1 | 4 | 9>(4);
  const [now, setNow] = useState(new Date());
  const [tab, setTab] = useState<'live' | 'playback' | 'analytics'>('live');

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const fetchData = async () => {
    try {
      const host = window.location.hostname;
      const [c, e] = await Promise.all([
        fetch(`http://${host}:8000/cameras`).then(r => r.ok ? r.json() : []),
        fetch(`http://${host}:8000/events?limit=6`).then(r => r.ok ? r.json() : []),
      ]);
      setCameras(c);
      setEvents(e);
    } catch {}
  };

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 5000); return () => clearInterval(t); }, []);

  const gridClass = layout === 1 ? 'g1' : layout === 4 ? 'g4' : 'g9';
  const onlineCams = cameras.filter(c => c.status !== 'offline').length;

  const GridIcon = ({ n }: { n: number }) => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
      {n === 1 && <rect x="0.5" y="0.5" width="12" height="12" rx="1.5" />}
      {n === 4 && (<><rect x="0.5" y="0.5" width="5.5" height="5.5" rx="1"/><rect x="7" y="0.5" width="5.5" height="5.5" rx="1"/><rect x="0.5" y="7" width="5.5" height="5.5" rx="1"/><rect x="7" y="7" width="5.5" height="5.5" rx="1"/></>)}
      {n === 9 && (<><rect x="0.5" y="0.5" width="3.3" height="3.3" rx="0.5"/><rect x="4.85" y="0.5" width="3.3" height="3.3" rx="0.5"/><rect x="9.2" y="0.5" width="3.3" height="3.3" rx="0.5"/><rect x="0.5" y="4.85" width="3.3" height="3.3" rx="0.5"/><rect x="4.85" y="4.85" width="3.3" height="3.3" rx="0.5"/><rect x="9.2" y="4.85" width="3.3" height="3.3" rx="0.5"/><rect x="0.5" y="9.2" width="3.3" height="3.3" rx="0.5"/><rect x="4.85" y="9.2" width="3.3" height="3.3" rx="0.5"/><rect x="9.2" y="9.2" width="3.3" height="3.3" rx="0.5"/></>)}
    </svg>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Top Bar ── */}
      <div className="topbar">
        {/* Tabs */}
        <div className="topbar-tabs">
          {(['live', 'playback', 'analytics'] as const).map(t2 => (
            <button
              key={t2}
              className={`topbar-tab${tab === t2 ? ' active' : ''}`}
              onClick={() => setTab(t2)}
            >
              {t2 === 'live' ? 'Live View' : t2.charAt(0).toUpperCase() + t2.slice(1)}
            </button>
          ))}
        </div>

        {/* System stats */}
        <div className="topbar-stats">
          <div className="topbar-stat">
            <span className="topbar-stat-label">System Health</span>
            <span className="topbar-stat-value ok">● System OK</span>
          </div>
          <div className="topbar-stat">
            <span className="topbar-stat-label">Cameras</span>
            <span className="topbar-stat-value cyan">{onlineCams} / {cameras.length} Online</span>
          </div>
          <div className="topbar-stat">
            <span className="topbar-stat-label">AI Status</span>
            <span className="topbar-stat-value" style={{ color: 'var(--pink)' }}>Active</span>
          </div>

          {/* Layout picker */}
          <div className="layout-toggle">
            {([1, 4, 9] as const).map(n => (
              <button
                key={n}
                className={`layout-btn${layout === n ? ' active' : ''}`}
                onClick={() => setLayout(n)}
                title={n === 1 ? '1×1' : n === 4 ? '2×2' : '3×3'}
              >
                <GridIcon n={n} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Camera Grid ── */}
      {cameras.length === 0 ? (
        <div className="empty" style={{ flex: 1 }}>
          <div className="empty-title">No Cameras Added</div>
          <div className="empty-sub">
            Go to <strong>Settings</strong> to add cameras manually or auto-discover ONVIF devices on your network.
          </div>
        </div>
      ) : (
        <div className={`cam-grid ${gridClass}`} style={{ flex: 1, minHeight: 0 }}>
          {cameras.slice(0, layout).map(cam => (
            <CameraFeed key={cam.id} cam={cam} />
          ))}
        </div>
      )}

      {/* ── Bottom Bar ── */}
      <div className="bottom-bar">
        <div className="live-toggle">
          <button className="live-btn active">Live</button>
          <button className="live-btn">Playback</button>
        </div>
        <button className="cam-btn" style={{ width: 26, height: 26 }}>▶</button>

        <div className="bottom-clock" style={{ marginLeft: 10 }}>
          <div className="clock-time">
            {now.toLocaleTimeString('en-GB', { hour12: false })} UTC
          </div>
          <div className="clock-date">
            {now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>

        <div className="search-pill">
          🔍 <span>Search events…</span>
        </div>

        <div className="event-log">
          <span className="event-log-label">Event Log</span>
          <div className="event-rows">
            {events.length === 0 ? (
              <span style={{ fontSize: '0.7rem', color: 'var(--t3)' }}>No events yet</span>
            ) : events.slice(0, 2).map((ev: any, i) => {
              const cls = ev.object_class ?? '';
              return (
                <div key={i} className="event-row">
                  <div className={`event-dot ${cls === 'person' ? 'person' : cls === 'vehicle' || cls === 'car' ? 'vehicle' : 'other'}`} />
                  <span className="event-text">
                    {cls ? `${cls.charAt(0).toUpperCase()}${cls.slice(1)} detected` : ev.event_type ?? 'Event'}
                  </span>
                  <span className="event-time">
                    {new Date(ev.timestamp ?? ev.created_at).toLocaleTimeString('en-GB', { hour12: false })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveView;
