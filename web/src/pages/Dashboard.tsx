import React, { useState, useEffect } from 'react';
import { Camera, Shield, Activity, HardDrive, AlertTriangle, Play, Settings as SettingsIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const mockChartData = [
  { time: '00:00', events: 12 }, { time: '04:00', events: 5 }, { time: '08:00', events: 45 },
  { time: '12:00', events: 32 }, { time: '16:00', events: 68 }, { time: '20:00', events: 24 },
  { time: '24:00', events: 18 }
];

const mockCameras = [
  { id: 1, name: 'Front Door', status: 'recording', lastEvent: 'Person detected (2m ago)' },
  { id: 2, name: 'Driveway', status: 'recording', lastEvent: 'Vehicle detected (15m ago)' },
  { id: 3, name: 'Back Garden', status: 'online', lastEvent: 'Motion (1h ago)' },
  { id: 4, name: 'Side Gate', status: 'offline', lastEvent: 'Connection lost (3h ago)' },
];

const mockEvents = [
  { id: 101, cam: 'Front Door', type: 'Person', time: '2m ago', conf: 92 },
  { id: 102, cam: 'Driveway', type: 'Vehicle', time: '15m ago', conf: 88 },
  { id: 103, cam: 'Front Door', type: 'Package', time: '45m ago', conf: 95 },
  { id: 104, cam: 'Side Gate', type: 'Animal', time: '1.5h ago', conf: 76 },
];

export const Dashboard = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2rem' }}>Sentinel Overview</h1>
          <p style={{ color: 'var(--text-muted)' }}>System health and real-time alerts</p>
        </div>
      </header>

      {/* Row 1: Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(0,212,255,0.1)', borderRadius: '12px', color: 'var(--color-primary)' }}>
            <Camera size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Cameras</p>
            <div className="stat-value">12<span style={{ fontSize: '1rem', color: 'var(--color-success)', marginLeft: '8px' }}>+3 online</span></div>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(244,63,94,0.1)', borderRadius: '12px', color: 'var(--color-danger)' }}>
            <AlertTriangle size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Events Today</p>
            <div className="stat-value">847<span style={{ fontSize: '1rem', color: 'var(--color-danger)', marginLeft: '8px' }}>+12%</span></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.1)', borderRadius: '12px', color: 'var(--color-success)' }}>
            <Activity size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>System Health</p>
            <div className="stat-value">99.9%<span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginLeft: '8px' }}>CPU 14%</span></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(124,58,237,0.1)', borderRadius: '12px', color: 'var(--color-accent)' }}>
            <HardDrive size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Storage Used</p>
            <div className="stat-value">2.3<span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginLeft: '4px' }}>TB / 8TB</span></div>
          </div>
        </div>
      </div>

      {/* Row 2: Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Camera Grid */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Play size={20} color="var(--color-primary)" /> Live Preview Grid
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {mockCameras.map(cam => (
              <div key={cam.id} style={{ 
                position: 'relative', 
                height: '200px', 
                background: '#000', 
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid var(--surface-border)'
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.8) 100%)', zIndex: 1 }}></div>
                <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 2, display: 'flex', gap: '8px' }}>
                  <div className={`status-indicator ${cam.status}`}></div>
                </div>
                <div style={{ position: 'absolute', bottom: '10px', left: '10px', zIndex: 2 }}>
                  <h4 style={{ color: '#fff', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{cam.name}</h4>
                  <p style={{ color: 'var(--color-primary)', fontSize: '0.8rem', margin: 0 }}>{cam.lastEvent}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Events Feed & Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Recent Events</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {mockEvents.map(ev => (
                <div key={ev.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '0.75rem', 
                  background: 'rgba(255,255,255,0.02)', 
                  borderRadius: '8px',
                  borderLeft: `4px solid ${ev.type === 'Person' ? 'var(--color-danger)' : 'var(--color-primary)'}`
                }}>
                  <div style={{ width: '40px', height: '40px', background: '#222', borderRadius: '4px' }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{ev.type}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ev.time}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ev.cam}</div>
                  </div>
                  <div style={{ fontSize: '0.8rem', padding: '2px 6px', background: 'var(--surface-glass)', borderRadius: '4px', color: 'var(--color-success)' }}>
                    {ev.conf}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', height: '200px' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Activity Trend</h3>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData}>
                <defs>
                  <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Area type="monotone" dataKey="events" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorEvents)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
