import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  Camera as CamIcon,
  ExternalLink,
  Focus,
  Maximize2,
  Mic,
  Pause,
  Play,
  Video,
  WifiOff,
} from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiUrl, go2rtcUrl } from '../lib/endpoints';

interface Camera {
  id: string;
  name: string;
  rtsp_url_main?: string;
  rtsp_url_sub?: string;
  status: string;
  resolution?: string;
  location?: string;
  has_motion?: boolean;
}

interface CameraEvent {
  id?: string;
  camera_id?: string;
  object_class?: string;
  confidence?: number;
  timestamp?: string;
  created_at?: string;
}

interface RecordingFile {
  camera_id: string;
  filename: string;
  url: string;
  created_at: string;
  startTimestamp: number;
  endTimestamp: number;
}

type ViewMode = 'live' | 'playback' | 'analytics';

const parseRecording = (r: any): RecordingFile => {
  const match = r.filename.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/);
  let start = new Date(r.created_at).getTime();
  if (match) {
    const [, y, m, d, hr, min, sec] = match;
    start = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(hr), parseInt(min), parseInt(sec)).getTime();
  }
  return {
    ...r,
    startTimestamp: start,
    endTimestamp: Math.max(start + 5000, new Date(r.created_at).getTime()),
  };
};

const inputDate = (date: Date) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const inputTime = (date: Date) => {
  const h = `${date.getHours()}`.padStart(2, '0');
  const m = `${date.getMinutes()}`.padStart(2, '0');
  return `${h}:${m}`;
};

const CameraFeed: React.FC<{
  cam: Camera;
  iceServers: RTCIceServer[];
  analytics?: boolean;
  maximized?: boolean;
  paused?: boolean;
  onMaximize?: () => void;
}> = ({ cam, iceServers, analytics = false, maximized = false, paused = false, onMaximize }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [connected, setConnected] = useState(false);
  const streamName = maximized ? `${cam.id}_main` : cam.rtsp_url_sub ? `${cam.id}_sub` : cam.id;

  useEffect(() => {
    if (cam.status === 'offline' || !cam.rtsp_url_main) return;

    const pc = new RTCPeerConnection({ iceServers });
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
        const res = await fetch(go2rtcUrl(`/api/webrtc?src=${encodeURIComponent(streamName)}`), {
          method: 'POST',
          body: offer.sdp,
        });
        if (res.ok) await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() });
      } catch (e) {
        console.error('[WebRTC]', cam.name, e);
      }
    })();

    return () => {
      pc.close();
      setConnected(false);
    };
  }, [cam.id, cam.name, cam.status, cam.rtsp_url_main, streamName, JSON.stringify(iceServers)]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) video.pause();
    else video.play().catch(() => {});
  }, [paused]);

  const isOffline = cam.status === 'offline';

  return (
    <div className={`cam-cell${cam.has_motion || analytics ? ' has-motion' : ''}`}>
      <div className="cam-top">
        <div>
          <div className="cam-name">{cam.name}</div>
          {cam.location && <div className="cam-sub">{cam.location}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {cam.status === 'recording' && <div className="cam-rec"><div className="cam-rec-dot" /> REC</div>}
          <button className="cam-more">...</button>
        </div>
      </div>

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
              <span style={{ fontSize: '0.72rem', color: 'var(--t3)' }}>Connecting...</span>
            </div>
          )}
        </>
      )}

      {analytics && (
        <>
          <div style={{ position: 'absolute', left: '18%', top: '24%', width: '18%', height: '28%', border: '2px solid var(--cyan)', boxShadow: '0 0 14px var(--cyan-glow)', zIndex: 8 }} />
          <div style={{ position: 'absolute', left: '58%', top: '46%', width: '20%', height: '18%', border: '2px solid var(--pink)', boxShadow: '0 0 14px var(--pink-glow)', zIndex: 8 }} />
        </>
      )}

      <div className="cam-bottom">
        <button className="cam-btn" title="Focus"><Focus size={12} /></button>
        <button className="cam-btn" title="Audio"><Mic size={12} /></button>
        <button className="cam-btn" title="Snapshot"><CamIcon size={12} /></button>
        <button className="cam-btn" title="Maximize" onClick={onMaximize}><Maximize2 size={12} /></button>
        {connected && <span className="cam-info">WebRTC - {cam.rtsp_url_sub && !maximized ? 'Substream' : 'Main'}</span>}
      </div>
    </div>
  );
};

const LiveView: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('live');
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [events, setEvents] = useState<CameraEvent[]>([]);
  const [recordings, setRecordings] = useState<Record<string, RecordingFile[]>>({});
  const [layout, setLayout] = useState<1 | 4 | 9>(4);
  const [maximizedId, setMaximizedId] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([]);
  const [livePaused, setLivePaused] = useState(false);
  const [syncPaused, setSyncPaused] = useState(false);
  const [syncDate, setSyncDate] = useState(() => inputDate(new Date()));
  const [syncTime, setSyncTime] = useState(() => inputTime(new Date()));
  const [syncTargetMs, setSyncTargetMs] = useState(Date.now());
  const [syncWindowStart, setSyncWindowStart] = useState(Date.now() - 3 * 3600 * 1000);
  const syncVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const fetchData = async () => {
    try {
      const [c, e, cfg] = await Promise.all([
        fetch(apiUrl('/cameras')).then(r => r.ok ? r.json() : []),
        fetch(apiUrl('/events?limit=20')).then(r => r.ok ? r.json() : []),
        fetch(apiUrl('/system/config')).then(r => r.ok ? r.json() : null),
      ]);
      setCameras(c);
      setEvents(e);
      const servers = cfg?.network?.ice_servers || [];
      setIceServers(servers.map((url: string) => ({ urls: url })));
    } catch {}
  };

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (cameras.length === 0) return;
    (async () => {
      const next: Record<string, RecordingFile[]> = {};
      await Promise.all(cameras.map(async cam => {
        try {
          const res = await fetch(apiUrl(`/recordings-list?camera_id=${cam.id}`));
          next[cam.id] = res.ok ? (await res.json()).map(parseRecording).sort((a: RecordingFile, b: RecordingFile) => a.startTimestamp - b.startTimestamp) : [];
        } catch {
          next[cam.id] = [];
        }
      }));
      setRecordings(next);
    })();
  }, [cameras.map(c => c.id).join('|')]);

  const visibleCameras = maximizedId ? cameras.filter(c => c.id === maximizedId) : cameras.slice(0, layout);
  const onlineCams = cameras.filter(c => c.status !== 'offline').length;
  const gridClass = maximizedId || layout === 1 ? 'g1' : layout === 4 ? 'g4' : 'g9';
  const syncSpan = 6 * 3600 * 1000;

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ev of events) {
      const key = ev.object_class || 'event';
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [events]);

  const findRecording = (camId: string, targetMs: number) => {
    const files = recordings[camId] || [];
    return files.find(r => targetMs >= r.startTimestamp && targetMs <= r.endTimestamp) || files[files.length - 1] || null;
  };

  const seekSyncVideos = (targetMs: number) => {
    setSyncTargetMs(targetMs);
    for (const cam of cameras) {
      const rec = findRecording(cam.id, targetMs);
      const video = syncVideoRefs.current[cam.id];
      if (rec && video && video.src.includes(rec.url)) {
        const offset = Math.max(0, (targetMs - rec.startTimestamp) / 1000);
        video.currentTime = Math.min(offset, Number.isFinite(video.duration) ? Math.max(0, video.duration - 0.5) : offset);
      }
    }
  };

  const jumpSyncPlayback = () => {
    const target = new Date(`${syncDate}T${syncTime}`).getTime();
    if (Number.isNaN(target)) return;
    setSyncWindowStart(target - syncSpan / 2);
    seekSyncVideos(target);
  };

  const toggleTransport = () => {
    if (viewMode === 'live' || viewMode === 'analytics') setLivePaused(p => !p);
    if (viewMode === 'playback') {
      setSyncPaused(p => {
        const next = !p;
        Object.values(syncVideoRefs.current).forEach(video => {
          if (!video) return;
          if (next) video.pause();
          else video.play().catch(() => {});
        });
        return next;
      });
    }
  };

  const GridIcon = ({ n }: { n: number }) => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
      {n === 1 && <rect x="0.5" y="0.5" width="12" height="12" rx="1.5" />}
      {n === 4 && (<><rect x="0.5" y="0.5" width="5.5" height="5.5" rx="1"/><rect x="7" y="0.5" width="5.5" height="5.5" rx="1"/><rect x="0.5" y="7" width="5.5" height="5.5" rx="1"/><rect x="7" y="7" width="5.5" height="5.5" rx="1"/></>)}
      {n === 9 && (<><rect x="0.5" y="0.5" width="3.3" height="3.3" rx="0.5"/><rect x="4.85" y="0.5" width="3.3" height="3.3" rx="0.5"/><rect x="9.2" y="0.5" width="3.3" height="3.3" rx="0.5"/><rect x="0.5" y="4.85" width="3.3" height="3.3" rx="0.5"/><rect x="4.85" y="4.85" width="3.3" height="3.3" rx="0.5"/><rect x="9.2" y="4.85" width="3.3" height="3.3" rx="0.5"/><rect x="0.5" y="9.2" width="3.3" height="3.3" rx="0.5"/><rect x="4.85" y="9.2" width="3.3" height="3.3" rx="0.5"/><rect x="9.2" y="9.2" width="3.3" height="3.3" rx="0.5"/></>)}
    </svg>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="topbar">
        <div className="topbar-tabs">
          {[
            ['live', 'Live View'],
            ['playback', 'Playback'],
            ['analytics', 'Analytics'],
          ].map(([mode, label]) => (
            <button key={mode} className={`topbar-tab${viewMode === mode ? ' active' : ''}`} onClick={() => setViewMode(mode as ViewMode)}>
              {label}
            </button>
          ))}
        </div>

        <div className="topbar-stats" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace' }}>
            {now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} | {now.toLocaleTimeString('en-US', { hour12: false })}
          </div>
          <div className="topbar-stat"><span className="topbar-stat-label">System Health</span><span className="topbar-stat-value ok">System OK</span></div>
          <div className="topbar-stat"><span className="topbar-stat-label">Cameras</span><span className="topbar-stat-value cyan">{onlineCams} / {cameras.length} Online</span></div>
          <div className="topbar-stat"><span className="topbar-stat-label">AI Status</span><span className="topbar-stat-value" style={{ color: 'var(--pink)' }}>Active</span></div>
          <button className="layout-btn" title="Wallboard Popout" onClick={() => window.open('/wallboard', '_blank')}>
            <ExternalLink size={14} />
          </button>
          <div className="layout-toggle">
            {([1, 4, 9] as const).map(n => (
              <button key={n} className={`layout-btn${layout === n && !maximizedId ? ' active' : ''}`} onClick={() => { setMaximizedId(null); setLayout(n); }}>
                <GridIcon n={n} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {cameras.length === 0 ? (
        <div className="empty" style={{ flex: 1 }}>
          <div className="empty-title">No Cameras Added</div>
          <div className="empty-sub">Go to Settings to add cameras manually or auto-discover ONVIF devices.</div>
        </div>
      ) : viewMode === 'playback' ? (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12, padding: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input className="form-input" type="date" value={syncDate} onChange={e => setSyncDate(e.target.value)} style={{ width: 150 }} />
            <input className="form-input" type="time" value={syncTime} onChange={e => setSyncTime(e.target.value)} style={{ width: 120 }} />
            <button className="btn btn-primary" onClick={jumpSyncPlayback}>Jump All Cameras</button>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.max(0, Math.min(100, ((syncTargetMs - syncWindowStart) / syncSpan) * 100))}
              onChange={e => seekSyncVideos(syncWindowStart + (parseInt(e.target.value) / 100) * syncSpan)}
              style={{ flex: 1, accentColor: 'var(--cyan)' }}
            />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--t2)' }}>{new Date(syncTargetMs).toLocaleString()}</span>
          </div>
          <div className={`cam-grid ${gridClass}`} style={{ flex: 1, minHeight: 0 }}>
            {visibleCameras.map(cam => {
              const rec = findRecording(cam.id, syncTargetMs);
              return (
                <div className="cam-cell" key={cam.id}>
                  <div className="cam-top"><div className="cam-name">{cam.name}</div><div className="cam-rec"><div className="cam-rec-dot" /> SYNC</div></div>
                  {rec ? (
                    <video
                      ref={el => { syncVideoRefs.current[cam.id] = el; }}
                      key={rec.url}
                      src={apiUrl(rec.url)}
                      autoPlay={!syncPaused}
                      muted
                      playsInline
                      onLoadedMetadata={e => {
                        const video = e.currentTarget;
                        const offset = Math.max(0, (syncTargetMs - rec.startTimestamp) / 1000);
                        video.currentTime = Math.min(offset, Number.isFinite(video.duration) ? Math.max(0, video.duration - 0.5) : offset);
                      }}
                    />
                  ) : (
                    <div className="cam-placeholder"><Video size={26} /><span>No recording segment</span></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: viewMode === 'analytics' ? '1fr 300px' : '1fr', gap: 12, padding: 14 }}>
          <div className={`cam-grid ${gridClass}`} style={{ minHeight: 0 }}>
            {visibleCameras.map(cam => (
              <CameraFeed
                key={cam.id}
                cam={cam}
                iceServers={iceServers}
                paused={livePaused}
                analytics={viewMode === 'analytics'}
                maximized={maximizedId === cam.id}
                onMaximize={() => setMaximizedId(maximizedId === cam.id ? null : cam.id)}
              />
            ))}
          </div>
          {viewMode === 'analytics' && (
            <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div className="card-head"><span className="card-title">Active Detections</span></div>
              <div style={{ height: 180, padding: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="var(--t3)" />
                    <YAxis stroke="var(--t3)" allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--cyan)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {events.length === 0 ? <span style={{ color: 'var(--t3)' }}>No detections yet</span> : events.map((ev, i) => (
                  <div key={ev.id || i} className="event-row">
                    <Activity size={13} color="var(--cyan)" />
                    <span className="event-text">{ev.object_class || 'event'} detected</span>
                    <span className="event-time">{new Date(ev.timestamp || ev.created_at || Date.now()).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bottom-bar">
        <div className="live-toggle">
          <button className={`live-btn${viewMode === 'live' ? ' active' : ''}`} onClick={() => setViewMode('live')}>Live</button>
          <button className={`live-btn${viewMode === 'playback' ? ' active' : ''}`} onClick={() => setViewMode('playback')}>Playback</button>
        </div>
        <button className="cam-btn" style={{ width: 26, height: 26 }} onClick={toggleTransport}>
          {(viewMode === 'playback' ? syncPaused : livePaused) ? <Play size={13} /> : <Pause size={13} />}
        </button>
        <div className="bottom-clock" style={{ marginLeft: 10 }}>
          <div className="clock-time">{now.toLocaleTimeString('en-GB', { hour12: false })} UTC</div>
          <div className="clock-date">{now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>
        <div style={{ fontSize: '0.74rem', color: 'var(--t2)', fontFamily: 'JetBrains Mono, monospace', marginLeft: 12 }}>
          Bandwidth: 6.2 Mbps - Latency: 32ms - Codec: H.264
        </div>
        <div className="event-log">
          <span className="event-log-label">Event Log</span>
          <div className="event-rows">
            {events.length === 0 ? (
              <span style={{ fontSize: '0.7rem', color: 'var(--t3)' }}>No events yet</span>
            ) : events.slice(0, 2).map((ev, i) => (
              <div key={i} className="event-row">
                <div className={`event-dot ${ev.object_class === 'person' ? 'person' : ev.object_class === 'car' ? 'vehicle' : 'other'}`} />
                <span className="event-text">{ev.object_class || 'Event'} detected</span>
                <span className="event-time">{new Date(ev.timestamp || ev.created_at || Date.now()).toLocaleTimeString('en-GB', { hour12: false })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveView;
