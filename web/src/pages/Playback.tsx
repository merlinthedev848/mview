import React, { useState, useEffect, useRef } from 'react';
import { PlayCircle, ChevronLeft, ChevronRight, Download, Maximize2, Volume2 } from 'lucide-react';

const API = () => `http://${window.location.hostname}:8000`;

const Playback: React.FC = () => {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCam, setFilterCam] = useState<string>('all');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [recRes, camRes] = await Promise.all([
          fetch(`${API()}/recordings-list`),
          fetch(`${API()}/cameras`),
        ]);
        if (recRes.ok) setRecordings(await recRes.json());
        if (camRes.ok) setCameras(await camRes.json());
      } catch {}
      setLoading(false);
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const filtered = filterCam === 'all'
    ? recordings
    : recordings.filter(r => r.camera_id === filterCam);

  const getCamName = (id: string) => cameras.find(c => c.id === id)?.name ?? id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top bar */}
      <div className="topbar" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--t1)' }}>Smart Playback</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.76rem', color: 'var(--t2)' }}>Filter:</span>
          <select
            className="form-select"
            style={{ width: 180, padding: '5px 10px', fontSize: '0.78rem' }}
            value={filterCam}
            onChange={e => setFilterCam(e.target.value)}
          >
            <option value="all">All Cameras</option>
            {cameras.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="playback-layout">
        {/* Recording list */}
        <div className="playback-sidebar">
          <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid var(--border)' }}>
            <span className="card-title">Recordings</span>
            <span style={{ marginLeft: 8, fontSize: '0.7rem', color: 'var(--t3)' }}>
              {filtered.length} file{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="playback-list">
            {loading ? (
              <div className="empty"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
              <div className="empty">
                <div className="empty-title">No Recordings Yet</div>
                <div className="empty-sub">
                  Recordings appear here once cameras are added and recording begins.
                </div>
              </div>
            ) : (
              filtered.map((rec, i) => (
                <div
                  key={i}
                  className={`playback-item${selected?.url === rec.url ? ' active' : ''}`}
                  onClick={() => setSelected(rec)}
                >
                  <div className="playback-item-name">{getCamName(rec.camera_id)}</div>
                  <div className="playback-item-meta">
                    {new Date(rec.created_at).toLocaleString('en-GB', {
                      day: '2-digit', month: 'short',
                      hour: '2-digit', minute: '2-digit',
                    })} · {rec.size_mb} MB
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Video player */}
        <div className="playback-player">
          <div className="playback-video-wrap">
            {selected ? (
              <video
                ref={videoRef}
                src={`${API()}${selected.url}`}
                controls
                autoPlay
                style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 4 }}
              />
            ) : (
              <div className="empty" style={{ flex: 1 }}>
                <PlayCircle size={48} strokeWidth={1} color="var(--t3)" />
                <div className="empty-title">Select a recording</div>
                <div className="empty-sub">
                  Choose a file from the list on the left to begin playback.
                </div>
              </div>
            )}
          </div>

          {selected && (
            <div className="playback-controls-bar">
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--t1)' }}>
                {getCamName(selected.camera_id)}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--t2)', marginLeft: 6 }}>
                {new Date(selected.created_at).toLocaleString('en-GB')} · {selected.size_mb} MB
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <a
                  href={`${API()}${selected.url}`}
                  download={selected.filename}
                  className="btn btn-ghost"
                  style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                >
                  <Download size={13} /> Download
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Playback;
