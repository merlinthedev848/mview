import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, Wifi, WifiOff, CheckCircle, XCircle, Loader, ChevronDown, ChevronRight } from 'lucide-react';

const API = () => `http://${window.location.hostname}:8000`;

interface Camera {
  id: string;
  name: string;
  rtsp_url_main: string;
  rtsp_url_sub?: string;
  onvif_endpoint?: string;
  manufacturer?: string;
  model?: string;
  resolution?: string;
  status: string;
  auto_adopted: boolean;
  created_at: string;
}

interface ManualForm {
  name: string;
  ip: string;
  port: string;
  onvif_username: string;
  onvif_password: string;
  rtsp_url_main: string;
  rtsp_url_sub: string;
}

const emptyForm: ManualForm = {
  name: '',
  ip: '',
  port: '80',
  onvif_username: 'admin',
  onvif_password: '',
  rtsp_url_main: '',
  rtsp_url_sub: '',
};

type Tab = 'cameras' | 'ai' | 'network' | 'system';

const Settings: React.FC = () => {
  const [tab, setTab] = useState<Tab>('cameras');
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<any[]>([]);
  const [discoveryError, setDiscoveryError] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState<ManualForm>(emptyForm);
  const [savingManual, setSavingManual] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [adopting, setAdopting] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchCameras = async () => {
    try {
      const res = await fetch(`${API()}/cameras`);
      if (res.ok) setCameras(await res.json());
    } catch {}
  };

  useEffect(() => { fetchCameras(); }, []);

  // ── Auto-Discover ───────────────────────────────────────────────
  const discover = async () => {
    setDiscovering(true);
    setDiscovered([]);
    setDiscoveryError('');
    try {
      const res = await fetch(`${API()}/cameras/discover`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setDiscovered(data);
        if (data.length === 0) setDiscoveryError('No ONVIF cameras found. Check that your cameras are on the same network and ONVIF is enabled, or add cameras manually below.');
      } else {
        setDiscoveryError('Discovery request failed. The API may not be able to reach the network from inside Docker. Add cameras manually instead.');
      }
    } catch {
      setDiscoveryError('Could not reach the API server.');
    }
    setDiscovering(false);
  };

  const adoptCamera = async (cam: any) => {
    setAdopting(cam.id || cam.onvif_endpoint);
    try {
      const res = await fetch(`${API()}/cameras/adopt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cam),
      });
      if (res.ok) {
        setDiscovered(prev => prev.filter(c => c.onvif_endpoint !== cam.onvif_endpoint));
        await fetchCameras();
        showToast('Camera adopted successfully!');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(`Failed to adopt: ${err.detail || 'Unknown error'}`);
      }
    } catch {
      showToast('Network error while adopting.');
    }
    setAdopting(null);
  };

  // ── Manual Add ──────────────────────────────────────────────────
  const addManually = async () => {
    if (!manualForm.name.trim()) { setSaveError('Camera name is required.'); return; }
    if (!manualForm.rtsp_url_main.trim() && !manualForm.ip.trim()) {
      setSaveError('Either an RTSP URL or IP address is required.'); return;
    }
    setSavingManual(true);
    setSaveError('');
    try {
      const body: any = {
        name: manualForm.name.trim(),
        rtsp_url_main: manualForm.rtsp_url_main.trim() || `rtsp://${manualForm.onvif_username}:${manualForm.onvif_password}@${manualForm.ip.trim()}:554/stream1`,
        rtsp_url_sub: manualForm.rtsp_url_sub.trim() || undefined,
        onvif_endpoint: manualForm.ip ? `http://${manualForm.ip.trim()}:${manualForm.port}/onvif/device_service` : undefined,
        onvif_username: manualForm.onvif_username,
        onvif_password: manualForm.onvif_password,
        manufacturer: 'Manual',
        model: 'IP Camera',
        status: 'online',
        auto_adopted: false,
      };
      const res = await fetch(`${API()}/cameras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setManualForm(emptyForm);
        setShowManualForm(false);
        await fetchCameras();
        showToast('Camera added successfully!');
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveError(err.detail || 'Failed to save camera.');
      }
    } catch {
      setSaveError('Network error.');
    }
    setSavingManual(false);
  };

  // ── Delete ──────────────────────────────────────────────────────
  const deleteCamera = async (id: string) => {
    if (!window.confirm('Delete this camera? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await fetch(`${API()}/cameras/${id}`, { method: 'DELETE' });
      await fetchCameras();
      showToast('Camera removed.');
    } catch {}
    setDeletingId(null);
  };

  const navTabs: { id: Tab; label: string }[] = [
    { id: 'cameras', label: 'Cameras & Hardware' },
    { id: 'ai', label: 'AI & Detection' },
    { id: 'network', label: 'Network' },
    { id: 'system', label: 'System' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div className="topbar" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)' }}>System Configuration</h1>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Manage hardware, AI pipelines and network settings</span>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, padding: 20, overflow: 'hidden', minHeight: 0 }}>
        {/* Sidebar nav */}
        <div className="settings-nav">
          {navTabs.map(t => (
            <button
              key={t.id}
              className={`nav-item${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 20, paddingRight: 4 }}>

          {tab === 'cameras' && (
            <>
              {/* ── Existing Cameras ── */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Active Cameras</span>
                  <button className="btn btn-primary" onClick={() => setShowManualForm(v => !v)}>
                    <Plus size={15} /> Add Camera Manually
                  </button>
                </div>

                {/* Manual Add Form */}
                {showManualForm && (
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(0,229,255,0.03)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--cyan)', marginBottom: 14 }}>
                      ＋ New Camera
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Camera Name *</label>
                        <input className="form-input" placeholder="e.g. Front Door" value={manualForm.name}
                          onChange={e => setManualForm(f => ({ ...f, name: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">IP Address</label>
                        <input className="form-input" placeholder="e.g. 192.168.1.100" value={manualForm.ip}
                          onChange={e => setManualForm(f => ({ ...f, ip: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">ONVIF Port</label>
                        <input className="form-input" placeholder="80" value={manualForm.port}
                          onChange={e => setManualForm(f => ({ ...f, port: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Username</label>
                        <input className="form-input" placeholder="admin" value={manualForm.onvif_username}
                          onChange={e => setManualForm(f => ({ ...f, onvif_username: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Password</label>
                        <input className="form-input" type="password" placeholder="••••••••" value={manualForm.onvif_password}
                          onChange={e => setManualForm(f => ({ ...f, onvif_password: e.target.value }))} />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">RTSP Main Stream URL (optional, auto-built from IP if empty)</label>
                        <input className="form-input" placeholder="rtsp://admin:pass@192.168.1.100:554/stream1"
                          value={manualForm.rtsp_url_main}
                          onChange={e => setManualForm(f => ({ ...f, rtsp_url_main: e.target.value }))} />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">RTSP Sub Stream URL (optional)</label>
                        <input className="form-input" placeholder="rtsp://admin:pass@192.168.1.100:554/stream2"
                          value={manualForm.rtsp_url_sub}
                          onChange={e => setManualForm(f => ({ ...f, rtsp_url_sub: e.target.value }))} />
                      </div>
                    </div>
                    {saveError && (
                      <div style={{ marginTop: 10, color: 'var(--red)', fontSize: '0.8rem' }}>⚠ {saveError}</div>
                    )}
                    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                      <button className="btn btn-primary" onClick={addManually} disabled={savingManual}>
                        {savingManual ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving…</> : <><CheckCircle size={15} /> Save Camera</>}
                      </button>
                      <button className="btn btn-ghost" onClick={() => { setShowManualForm(false); setSaveError(''); setManualForm(emptyForm); }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {cameras.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-title">No cameras added yet</div>
                    <div className="empty-state-sub">Use "Add Camera Manually" above or auto-discover ONVIF devices below.</div>
                  </div>
                ) : (
                  <div>
                    {cameras.map(cam => (
                      <div key={cam.id} style={{
                        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                        borderBottom: '1px solid var(--border)',
                      }}>
                        <div className={`dot ${cam.status === 'offline' ? 'offline' : cam.status === 'recording' ? 'recording' : 'online'}`} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-1)' }}>{cam.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cam.rtsp_url_main || cam.onvif_endpoint || '—'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span style={{
                            fontSize: '0.68rem', padding: '2px 8px', borderRadius: 20,
                            background: cam.status === 'offline' ? 'rgba(255,255,255,0.04)' : cam.status === 'recording' ? 'var(--red-dim)' : 'var(--green-dim)',
                            color: cam.status === 'offline' ? 'var(--text-3)' : cam.status === 'recording' ? 'var(--red)' : 'var(--green)',
                            fontWeight: 600, border: '1px solid',
                            borderColor: cam.status === 'offline' ? 'var(--border)' : cam.status === 'recording' ? 'rgba(255,23,68,0.3)' : 'rgba(0,230,118,0.3)',
                          }}>
                            {cam.status.toUpperCase()}
                          </span>
                          {cam.manufacturer && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border)' }}>
                              {cam.manufacturer} {cam.model}
                            </span>
                          )}
                        </div>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '6px 10px' }}
                          onClick={() => deleteCamera(cam.id)}
                          disabled={deletingId === cam.id}
                        >
                          {deletingId === cam.id ? <div className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Auto-Discovery ── */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Auto-Discover ONVIF Cameras</span>
                  <button className="btn btn-primary" onClick={discover} disabled={discovering}>
                    {discovering
                      ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Scanning…</>
                      : <><Search size={15} /> Scan Network</>
                    }
                  </button>
                </div>

                <div style={{ padding: '12px 20px', fontSize: '0.8rem', color: 'var(--text-2)', borderBottom: '1px solid var(--border)' }}>
                  <strong style={{ color: 'var(--amber)' }}>⚠ Note:</strong> ONVIF WS-Discovery uses UDP multicast.
                  If the API runs inside Docker with bridge networking, cameras on your LAN may not be reachable.
                  For best results, add the line <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>network_mode: host</code> to
                  the <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>api</code> service in your docker-compose.yml,
                  or use the manual form above.
                </div>

                {discoveryError && (
                  <div style={{ padding: '14px 20px', color: 'var(--amber)', fontSize: '0.82rem' }}>
                    ⚠ {discoveryError}
                  </div>
                )}

                {discovered.length > 0 && (
                  <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--green)', fontWeight: 600, marginBottom: 4 }}>
                      ✓ Found {discovered.length} device{discovered.length !== 1 ? 's' : ''}
                    </div>
                    {discovered.map((cam, i) => (
                      <div key={i} className="discovery-item">
                        <div className="discovery-item-info">
                          <div className="name">{cam.manufacturer} {cam.model}</div>
                          <div className="url">{cam.onvif_endpoint} · {cam.ip}</div>
                        </div>
                        <button
                          className="btn btn-primary"
                          onClick={() => adoptCamera(cam)}
                          disabled={adopting === (cam.id || cam.onvif_endpoint)}
                        >
                          {adopting === (cam.id || cam.onvif_endpoint)
                            ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                            : <><Plus size={14} /> Adopt</>
                          }
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {!discovering && discovered.length === 0 && !discoveryError && (
                  <div className="empty-state">
                    <div className="empty-state-sub">Click "Scan Network" to search for ONVIF cameras on your local network.</div>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'ai' && (
            <div className="card">
              <div className="card-header"><span className="card-title">AI Pipeline Configuration</span></div>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Detection Model</label>
                  <select className="form-select">
                    <option value="yolov8n">YOLOv8 Nano (Fastest — CPU optimised)</option>
                    <option value="yolov8s">YOLOv8 Small (Balanced)</option>
                    <option value="yolo11n">YOLO11 Nano (Next-Gen)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Hardware Accelerator</label>
                  <select className="form-select">
                    <option value="auto">Auto-Detect (Recommended)</option>
                    <option value="cpu">CPU Only</option>
                    <option value="cuda">NVIDIA CUDA / TensorRT</option>
                    <option value="openvino">Intel OpenVINO</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Detection Confidence Threshold</label>
                  <input className="form-input" type="range" min="0.3" max="0.95" step="0.05" defaultValue="0.5" />
                </div>
                <button className="btn btn-primary" style={{ width: 'fit-content' }}>Save AI Config</button>
              </div>
            </div>
          )}

          {tab === 'network' && (
            <div className="card">
              <div className="card-header"><span className="card-title">Network Settings</span></div>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">go2rtc Proxy Host</label>
                  <input className="form-input" defaultValue="localhost:1984" />
                </div>
                <div className="form-group">
                  <label className="form-label">WebRTC ICE Servers</label>
                  <input className="form-input" defaultValue="stun:stun.l.google.com:19302" />
                </div>
                <button className="btn btn-primary" style={{ width: 'fit-content' }}>Save Network Config</button>
              </div>
            </div>
          )}

          {tab === 'system' && (
            <div className="card">
              <div className="card-header"><span className="card-title">System</span></div>
              <div style={{ padding: 20, color: 'var(--text-2)', fontSize: '0.875rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    ['Platform', 'mView Sentinel NVR'],
                    ['API Version', '1.0.0'],
                    ['Build', 'Docker (Multi-stage)'],
                    ['Database', 'PostgreSQL 16 + pgvector'],
                    ['Message Bus', 'Redis 7 + MQTT (Mosquitto)'],
                    ['Streaming', 'go2rtc (WebRTC / RTSP)'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px' }}>{k}</span>
                      <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: 'var(--bg-card)', border: '1px solid var(--cyan-border)',
          borderRadius: 'var(--radius-md)', padding: '12px 18px',
          fontSize: '0.85rem', color: 'var(--text-1)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(12px)',
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
};

export default Settings;
