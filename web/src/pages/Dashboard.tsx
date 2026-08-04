import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Camera, HardDrive, Play } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import VideoPlayer from '../components/VideoPlayer';
import { apiUrl } from '../lib/endpoints';

interface DashboardCamera {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'recording';
  has_motion?: boolean;
}

interface DashboardEvent {
  id: string;
  camera_id: string;
  object_class?: string;
  confidence?: number;
  timestamp?: string;
}

const panelStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-lg)',
  overflow: 'hidden',
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '14px 16px',
  borderBottom: '1px solid var(--border)',
};

const formatStorage = (gb?: number) => {
  if (!gb || gb <= 0) return '0 GB';
  if (gb >= 1024) return `${(gb / 1024).toFixed(2)} TB`;
  return `${gb.toFixed(1)} GB`;
};

export const Dashboard = () => {
  const [cameras, setCameras] = useState<DashboardCamera[]>([]);
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [storage, setStorage] = useState<{ total_gb: number; used_gb: number; usage_percent: number } | null>(null);
  const [stats, setStats] = useState({ total_cameras: 0, online_cameras: 0, events_today: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [camRes, eventRes, healthRes] = await Promise.all([
          fetch(apiUrl('/cameras')),
          fetch(apiUrl('/events?limit=20')),
          fetch(apiUrl('/system/health')),
        ]);

        if (camRes.ok) {
          const camData = await camRes.json() as DashboardCamera[];
          setCameras(camData);
          setStats(s => ({
            ...s,
            total_cameras: camData.length,
            online_cameras: camData.filter(c => c.status === 'online' || c.status === 'recording').length,
          }));
        }

        if (eventRes.ok) {
          const eventData = await eventRes.json() as DashboardEvent[];
          setEvents(eventData);
          setStats(s => ({ ...s, events_today: eventData.length }));
        }

        if (healthRes.ok) {
          const healthData = await healthRes.json();
          if (healthData.storage) setStorage(healthData.storage);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
    };

    fetchData();
    const interval = window.setInterval(fetchData, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const chartData = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (const event of events) {
      const label = event.object_class || 'other';
      buckets[label] = (buckets[label] || 0) + 1;
    }
    return Object.entries(buckets).map(([name, count]) => ({ name, count }));
  }, [events]);

  const kpis = [
    {
      label: 'Active Cameras',
      value: stats.total_cameras,
      detail: `${stats.online_cameras} online`,
      icon: Camera,
      tone: 'var(--cyan)',
      background: 'rgba(57,255,20,0.09)',
    },
    {
      label: 'AI Events',
      value: stats.events_today,
      detail: 'real-time',
      icon: AlertTriangle,
      tone: 'var(--red)',
      background: 'rgba(244,63,94,0.10)',
    },
    {
      label: 'System Health',
      value: 'OK',
      detail: 'online',
      icon: Activity,
      tone: 'var(--green)',
      background: 'rgba(34,197,94,0.10)',
    },
    {
      label: 'Storage Used',
      value: storage ? formatStorage(storage.used_gb) : '0 GB',
      detail: storage ? `${formatStorage(storage.total_gb)} total - ${storage.usage_percent}%` : 'loading',
      icon: HardDrive,
      tone: 'var(--pink)',
      background: 'rgba(255,0,255,0.10)',
    },
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: '100%' }}>
        <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '1.35rem', lineHeight: 1.1, margin: 0, fontWeight: 800, color: 'var(--t1)' }}>
              mView Sentinel Overview
            </h1>
            <p style={{ color: 'var(--t2)', margin: '5px 0 0', fontSize: '0.84rem' }}>
              System health, live cameras, recording status, and AI alerts
            </p>
          </div>
          <div style={{ color: 'var(--t3)', fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace' }}>
            Refreshes every 5s
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))', gap: 12 }}>
          {kpis.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} style={{ ...panelStyle, padding: 14, display: 'flex', alignItems: 'center', gap: 12, minHeight: 88 }}>
                <div style={{ width: 42, height: 42, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: item.background, color: item.tone, flexShrink: 0 }}>
                  <Icon size={22} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="card-title">{item.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6, minWidth: 0 }}>
                    <span style={{ color: 'var(--t1)', fontSize: '1.3rem', fontWeight: 800, lineHeight: 1 }}>{item.value}</span>
                    <span style={{ color: item.tone, fontSize: '0.74rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.detail}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(520px, 1.65fr) minmax(320px, 0.95fr)', gap: 16, alignItems: 'stretch', flex: 1, minHeight: 0 }}>
          <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={sectionHeaderStyle}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--t1)', fontSize: '0.95rem', margin: 0 }}>
                <Play size={16} color="var(--cyan)" /> Live Camera Grid
              </h2>
              <span className="badge online">{stats.online_cameras}/{stats.total_cameras}</span>
            </div>

            <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, alignContent: 'start', overflowY: 'auto' }}>
              {cameras.length === 0 ? (
                <div className="empty" style={{ minHeight: 300, gridColumn: '1 / -1' }}>
                  <Camera size={24} />
                  <div className="empty-title">No Cameras Added</div>
                  <div className="empty-sub">Add ONVIF cameras or import an existing NVR from Operations.</div>
                </div>
              ) : (
                cameras.slice(0, 6).map(cam => (
                  <div key={cam.id} style={{ aspectRatio: '16 / 9', minHeight: 210 }}>
                    <VideoPlayer
                      cameraId={cam.id}
                      name={cam.name}
                      status={cam.status}
                      hasMotion={cam.has_motion}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateRows: 'minmax(300px, 1fr) 260px', gap: 16, minHeight: 0 }}>
            <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={sectionHeaderStyle}>
                <h2 style={{ color: 'var(--t1)', fontSize: '0.95rem', margin: 0 }}>Real-Time Events</h2>
                <span className={`badge ${events.length ? 'recording' : 'offline'}`}>{events.length}</span>
              </div>
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
                {events.length === 0 ? (
                  <div className="empty" style={{ minHeight: 220 }}>
                    <AlertTriangle size={22} />
                    <div className="empty-title">Waiting for AI detections</div>
                  </div>
                ) : (
                  events.map(event => (
                    <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.025)' }}>
                      <div className={`event-dot ${event.object_class === 'person' ? 'person' : event.object_class === 'car' ? 'vehicle' : 'other'}`} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <strong style={{ color: 'var(--t1)', fontSize: '0.82rem', textTransform: 'capitalize' }}>{event.object_class || 'event'}</strong>
                          <span style={{ color: 'var(--t3)', fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace' }}>
                            {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '--'}
                          </span>
                        </div>
                        <div style={{ color: 'var(--t3)', fontSize: '0.7rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Camera {event.camera_id}
                        </div>
                      </div>
                      <span style={{ color: 'var(--cyan)', fontSize: '0.72rem', fontWeight: 800 }}>
                        {Math.round((event.confidence || 0) * 100)}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={sectionHeaderStyle}>
                <h2 style={{ color: 'var(--t1)', fontSize: '0.95rem', margin: 0 }}>Activity Trend</h2>
              </div>
              <div style={{ flex: 1, minHeight: 0, padding: 12 }}>
                {chartData.length === 0 ? (
                  <div className="empty" style={{ height: '100%' }}>
                    <div className="empty-title">No historical trend data</div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--cyan)" stopOpacity={0.38} />
                          <stop offset="95%" stopColor="var(--cyan)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: 8, color: 'var(--t1)' }} />
                      <Area type="monotone" dataKey="count" stroke="var(--cyan)" fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
