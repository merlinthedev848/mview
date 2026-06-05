import React, { useState, useEffect } from 'react';
import { Camera, Shield, Activity, HardDrive, AlertTriangle, Play } from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';


export const Dashboard = () => {
  const [cameras, setCameras] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ total_cameras: 0, online_cameras: 0, events_today: 0 });

  useEffect(() => {
    // Fetch Real Data from FastAPI Backend
    const fetchData = async () => {
      try {
        // Fetch real cameras
        const camRes = await fetch('http://localhost:8000/cameras');
        if (camRes.ok) {
          const camData = await camRes.json();
          setCameras(camData);
          setStats(s => ({ ...s, total_cameras: camData.length, online_cameras: camData.filter((c: any) => c.status === 'online').length }));
        }

        // Fetch real events
        const eventRes = await fetch('http://localhost:8000/events?limit=10');
        if (eventRes.ok) {
          const eventData = await eventRes.json();
          setEvents(eventData);
          setStats(s => ({ ...s, events_today: eventData.length })); // simplified
        }
      } catch (error) {
        console.error("Failed to fetch real data, is the backend running?", error);
      }
    };

    fetchData();
    // Poll every 5 seconds for real-time updates
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2rem', margin: 0 }}>mView Sentinel Overview</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>System health and real-time alerts</p>
        </div>
      </header>

      {/* Row 1: Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(0,212,255,0.1)', borderRadius: '12px', color: 'var(--color-primary)' }}>
            <Camera size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Active Cameras</p>
            <div className="stat-value">{stats.total_cameras || 0}<span style={{ fontSize: '1rem', color: 'var(--color-success)', marginLeft: '8px' }}>{stats.online_cameras} online</span></div>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(244,63,94,0.1)', borderRadius: '12px', color: 'var(--color-danger)' }}>
            <AlertTriangle size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Events</p>
            <div className="stat-value">{stats.events_today || 0}<span style={{ fontSize: '1rem', color: 'var(--color-danger)', marginLeft: '8px' }}>Real-time</span></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.1)', borderRadius: '12px', color: 'var(--color-success)' }}>
            <Activity size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>System Health</p>
            <div className="stat-value">OK<span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginLeft: '8px' }}>DB Connected</span></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(124,58,237,0.1)', borderRadius: '12px', color: 'var(--color-accent)' }}>
            <HardDrive size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Storage Used</p>
            <div className="stat-value">0<span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginLeft: '4px' }}>TB / 8TB</span></div>
          </div>
        </div>
      </div>

      {/* Row 2: Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Camera Grid */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Play size={20} color="var(--color-primary)" /> Live Camera Grid
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '1.5rem', minHeight: 0 }}>
            {cameras.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center', gridColumn: 'span 2' }}>
                No cameras found in database. Go to Settings to adopt ONVIF cameras.
              </div>
            ) : (
              cameras.map((cam: any) => (
                <div key={cam.id} style={{ height: '250px' }}>
                  <VideoPlayer 
                    cameraId={cam.id}
                    name={cam.name}
                    status={cam.status}
                    hasMotion={false}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Events Feed & Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
            <h3 style={{ marginBottom: '1.5rem', margin: 0 }}>Real-Time Events</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              {events.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Waiting for AI detections...</div>
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
                    <div style={{ width: '40px', height: '40px', background: '#222', borderRadius: '4px' }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '0.9rem', textTransform: 'capitalize' }}>{ev.object_class}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Camera ID: {ev.camera_id}</div>
                    </div>
                    <div style={{ fontSize: '0.8rem', padding: '2px 6px', background: 'var(--surface-glass)', borderRadius: '4px', color: 'var(--color-success)' }}>
                      {Math.round((ev.confidence || 0) * 100)}%
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', height: '200px' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', margin: 0 }}>Activity Trend</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: 'var(--text-muted)' }}>
              No historical trend data available.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
