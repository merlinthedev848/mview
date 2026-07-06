import React, { useState, useEffect } from 'react';
import { Camera, Shield, Activity, HardDrive, AlertTriangle, Play, LayoutDashboard } from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { apiUrl } from '../lib/endpoints';

export const Dashboard = () => {
  const [cameras, setCameras] = useState([]);
  const [events, setEvents] = useState([]);
  const [storage, setStorage] = useState<{ total_gb: number; used_gb: number; usage_percent: number } | null>(null);
  const [stats, setStats] = useState({ total_cameras: 0, online_cameras: 0, events_today: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch cameras
        const camRes = await fetch(apiUrl('/cameras'));
        if (camRes.ok) {
          const camData = await camRes.json();
          setCameras(camData);
          setStats(s => ({ 
            ...s, 
            total_cameras: camData.length, 
            online_cameras: camData.filter((c: any) => c.status === 'online').length 
          }));
        }

        // Fetch events
        const eventRes = await fetch(apiUrl('/events?limit=20'));
        if (eventRes.ok) {
          const eventData = await eventRes.json();
          setEvents(eventData);
          setStats(s => ({ ...s, events_today: eventData.length }));
        }

        // Fetch storage health
        const healthRes = await fetch(apiUrl('/system/health'));
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          if (healthData.storage) {
            setStorage(healthData.storage);
          }
        }
      } catch (error) {
        console.error("Failed to fetch real dashboard data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const chartData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ev of events) {
      const cls = ev.object_class || 'other';
      counts[cls] = (counts[cls] || 0) + 1;
    }
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [events]);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2rem', margin: 0, fontWeight: 800 }}>mView Sentinel Overview</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, marginTop: 4 }}>System health and real-time alerts</p>
        </div>
      </header>

      {/* Row 1: Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(0,212,255,0.1)', borderRadius: '12px', color: 'var(--color-primary)' }}>
            <Camera size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Active Cameras</p>
            <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-1)' }}>
              {stats.total_cameras}
              <span style={{ fontSize: '0.85rem', color: 'var(--color-success)', marginLeft: '8px', fontWeight: 500 }}>
                {stats.online_cameras} online
              </span>
            </div>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(244,63,94,0.1)', borderRadius: '12px', color: 'var(--color-danger)' }}>
            <AlertTriangle size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>AI Events</p>
            <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-1)' }}>
              {stats.events_today}
              <span style={{ fontSize: '0.85rem', color: 'var(--color-danger)', marginLeft: '8px', fontWeight: 500 }}>
                Real-time
              </span>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.1)', borderRadius: '12px', color: 'var(--color-success)' }}>
            <Activity size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>System Health</p>
            <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-1)' }}>
              OK
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 500 }}>
                Online
              </span>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(124,58,237,0.1)', borderRadius: '12px', color: 'var(--color-accent)' }}>
            <HardDrive size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Storage Used</p>
            <div className="stat-value" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-1)' }}>
              {storage ? `${(storage.used_gb / 1024).toFixed(2)}` : '0.00'}
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '4px', fontWeight: 500 }}>
                TB / {storage ? `${(storage.total_gb / 1024).toFixed(1)}` : '0.0'} TB ({storage ? `${storage.usage_percent}` : '0'}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Camera Grid */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.1rem', color: 'var(--text-1)' }}>
            <Play size={20} color="var(--color-primary)" /> Live Camera Grid
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1.5rem', minHeight: 0 }}>
            {cameras.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', padding: '4rem 2rem', textAlign: 'center' }}>
                No cameras found in database. Go to Settings to adopt ONVIF cameras.
              </div>
            ) : (
              cameras.slice(0, 4).map((cam: any) => (
                <div key={cam.id} style={{ height: '240px' }}>
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

        {/* Events Feed & Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
            <h3 style={{ marginBottom: '1.5rem', margin: 0, fontSize: '1.1rem', color: 'var(--text-1)' }}>Real-Time Events</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              {events.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Waiting for AI detections...</div>
              ) : (
                events.map((ev: any) => (
                  <div key={ev.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    padding: '0.75rem', 
                    background: 'rgba(255,255,255,0.02)', 
                    borderRadius: '8px',
                    borderLeft: `4px solid ${ev.object_class === 'person' ? 'var(--color-danger)' : 'var(--color-primary)'}`
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.85rem', textTransform: 'capitalize', color: 'var(--text-1)' }}>{ev.object_class}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Camera ID: {ev.camera_id}</div>
                    </div>
                    <div style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(0,212,255,0.1)', borderRadius: '4px', color: 'var(--color-primary)', fontWeight: 600 }}>
                      {Math.round((ev.confidence || 0) * 100)}%
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', height: '220px' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', margin: 0, color: 'var(--text-1)' }}>Activity Trend</h3>
            {chartData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: 'var(--text-muted)' }}>
                No historical trend data available.
              </div>
            ) : (
              <div style={{ height: '80%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="count" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
