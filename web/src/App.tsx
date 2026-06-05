import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Video, PlaySquare, Bell, Settings as SettingsIcon, ShieldCheck, HardDrive, LogOut, Wifi } from 'lucide-react';

import LiveView  from './pages/LiveView';
import Playback  from './pages/Playback';
import Events    from './pages/Events';
import Settings  from './pages/Settings';

const API = () => `http://${window.location.hostname}:8000`;

const Sidebar = () => {
  const [cameras, setCameras] = useState<any[]>([]);
  const [events,  setEvents]  = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [c, e] = await Promise.all([
          fetch(`${API()}/cameras`).then(r => r.ok ? r.json() : []),
          fetch(`${API()}/events?limit=100`).then(r => r.ok ? r.json() : []),
        ]);
        setCameras(c);
        setEvents(e);
      } catch {}
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const onlineCams = cameras.filter(c => c.status !== 'offline').length;
  const unreadEvents = events.length;

  const navItems = [
    { to: '/',         label: 'Live View',  icon: <Video       size={16} />, end: true  },
    { to: '/playback', label: 'Playback',   icon: <PlaySquare  size={16} />, end: false },
    { to: '/events',   label: 'Events',     icon: <Bell        size={16} />, end: false, badge: unreadEvents || undefined },
    { to: '/settings', label: 'Settings',   icon: <SettingsIcon size={16} />, end: false },
  ];

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <ShieldCheck size={17} color="var(--cyan)" strokeWidth={2.5} />
        </div>
        <div>
          <div className="sidebar-logo-title">mView Sentinel</div>
          <div className="sidebar-logo-sub">NVR Platform</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="nav-section">Navigation</div>

        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            {item.icon}
            {item.label}
            {item.badge ? <span className="nav-badge">{item.badge > 99 ? '99+' : item.badge}</span> : null}
          </NavLink>
        ))}

        <div className="nav-section">System</div>

        <div style={{ padding: '6px 10px' }}>
          {/* Camera summary */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div className={`dot ${onlineCams > 0 ? 'online' : 'offline'}`} />
              <span style={{ fontSize: '0.78rem', color: 'var(--t1)', fontWeight: 600 }}>Cameras</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--t2)' }}>{onlineCams}/{cameras.length}</span>
          </div>

          {/* Network indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Wifi size={13} color="var(--t3)" />
            <span style={{ fontSize: '0.74rem', color: 'var(--t2)' }}>Network</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--green)' }}>OK</span>
          </div>
        </div>
      </nav>

      {/* Storage footer */}
      <div className="sidebar-footer">
        <div className="storage-label">
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <HardDrive size={12} /> Storage
          </span>
          <span>—</span>
        </div>
        <div className="storage-bar">
          <div className="storage-bar-fill" style={{ width: '42%' }} />
        </div>

        <button className="nav-item" style={{ color: 'var(--t3)', marginTop: 6 }}>
          <LogOut size={15} /> Logout
        </button>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="app-shell">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/"         element={<LiveView />}  />
            <Route path="/playback" element={<Playback />}  />
            <Route path="/events"   element={<Events />}    />
            <Route path="/settings" element={<Settings />}  />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
