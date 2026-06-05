import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Video, PlaySquare, Settings as SettingsIcon, Map as MapIcon, Shield } from 'lucide-react';

import Dashboard from './pages/Dashboard';
import LiveView from './pages/LiveView';
import Playback from './pages/Playback';
import Events from './pages/Events';
import Settings from './pages/Settings';

const Sidebar = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/live', label: 'Live View', icon: <Video size={20} /> },
    { path: '/playback', label: 'Playback', icon: <PlaySquare size={20} /> },
    { path: '/map', label: 'Map View', icon: <MapIcon size={20} /> },
    { path: '/settings', label: 'Settings', icon: <SettingsIcon size={20} /> },
  ];

  return (
    <div className="glass-panel" style={{ 
      width: '260px', 
      height: '100vh', 
      position: 'fixed', 
      left: 0, 
      top: 0, 
      display: 'flex', 
      flexDirection: 'column',
      borderRight: '1px solid var(--surface-border)',
      borderTop: 'none',
      borderBottom: 'none',
      borderLeft: 'none',
      borderRadius: 0,
      zIndex: 100
    }}>
      <div style={{ padding: '2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', padding: '8px', borderRadius: '12px', display: 'flex' }}>
          <Shield size={24} color="#fff" />
        </div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }} className="text-gradient">
          mView Sentinel
        </h2>
      </div>

      <nav style={{ flex: 1, padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                textDecoration: 'none',
                color: isActive ? '#fff' : 'var(--text-muted)',
                background: isActive ? 'var(--surface-glass-hover)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                transition: 'all 0.2s ease',
                fontWeight: isActive ? 600 : 500
              }}
            >
              <div style={{ color: isActive ? 'var(--color-primary)' : 'inherit' }}>
                {item.icon}
              </div>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--surface-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            CK
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Chris Kendall</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Administrator</div>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ flex: 1, marginLeft: '260px', position: 'relative' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/live" element={<LiveView />} />
            <Route path="/playback" element={<Playback />} />
            <Route path="/events" element={<Events />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-muted)'}}><h1>404</h1><p>Component under construction for Phase 1/2</p></div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
