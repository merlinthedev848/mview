import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Video, PlaySquare, Bell, Settings as SettingsIcon, ShieldCheck, HardDrive, LogOut, Wifi, LayoutDashboard, Map as MapIcon } from 'lucide-react';

import Login     from './pages/Login';
import { apiUrl } from './lib/endpoints';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const LiveView = lazy(() => import('./pages/LiveView'));
const Playback = lazy(() => import('./pages/Playback'));
const Events = lazy(() => import('./pages/Events'));
const MapView = lazy(() => import('./pages/MapView'));
const Settings = lazy(() => import('./pages/Settings'));
const Wallboard = lazy(() => import('./pages/Wallboard'));

// Setup global fetch interceptor to inject JWT
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  const token = localStorage.getItem('mview_token');
  
  if (token && typeof resource === 'string' && !resource.includes('/auth/login') && !resource.includes('/go2rtc/')) {
     config = config || {};
     config.headers = {
       ...config.headers,
       'Authorization': `Bearer ${token}`
     };
  }
  
  const res = await originalFetch(resource, config);
  
  // If API returns 401 Unauthorized (and not the login endpoint), force logout
  if (res.status === 401 && typeof resource === 'string' && !resource.includes('/auth/login')) {
    localStorage.removeItem('mview_token');
    window.dispatchEvent(new Event('storage')); // Trigger re-render
  }
  
  return res;
};

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  end: boolean;
  badge?: number;
};

const normalizePath = (path: string) => {
  const normalized = path.replace(/\/+$/, '');
  return normalized || '/';
};

const navigateTo = (path: string) => {
  if (normalizePath(window.location.pathname) === normalizePath(path)) return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const isActivePath = (currentPath: string, item: NavItem) => {
  const current = normalizePath(currentPath);
  const target = normalizePath(item.to);
  return item.end ? current === target : current === target || current.startsWith(`${target}/`);
};

const Sidebar = ({ onLogout, currentPath }: { onLogout: () => void; currentPath: string }) => {
  const [cameras, setCameras] = useState<any[]>([]);
  const [events,  setEvents]  = useState<any[]>([]);
  const [storage, setStorage] = useState<any>(null);
  const [recordingStorage, setRecordingStorage] = useState<any>(null);
  const [systemStats, setSystemStats] = useState({ cpu: '--', up: '0.00', down: '0.00', latency: '--' });

  useEffect(() => {
    let fallbackTimer: number | undefined;

    const applySnapshot = (snapshot: any) => {
      const h = snapshot?.health;
      setCameras(Array.isArray(snapshot?.cameras) ? snapshot.cameras : []);
      setEvents(Array.isArray(snapshot?.events) ? snapshot.events : []);
      if (snapshot?.recording_storage) setRecordingStorage(snapshot.recording_storage);
      if (h?.storage) {
        setStorage(h.storage);
        setSystemStats({
          cpu: typeof h.cpu_usage_percent === 'number' ? h.cpu_usage_percent.toFixed(1) : '--',
          up: typeof h.network?.up_mbps === 'number' ? h.network.up_mbps.toFixed(2) : '0.00',
          down: typeof h.network?.down_mbps === 'number' ? h.network.down_mbps.toFixed(2) : '0.00',
          latency: typeof h.latency_ms === 'number' ? `${h.latency_ms}` : '--',
        });
      }
    };

    const load = async () => {
      try {
        const started = performance.now();
        const [c, e, h, s] = await Promise.all([
          fetch(apiUrl('/cameras')).then(r => r.ok ? r.json() : []),
          fetch(apiUrl('/events?limit=20')).then(r => r.ok ? r.json() : []),
          fetch(apiUrl('/system/health')).then(r => r.ok ? r.json() : null),
          fetch(apiUrl('/system/storage-report')).then(r => r.ok ? r.json() : null),
        ]);
        setCameras(c);
        setEvents(e);
        if (s) setRecordingStorage(s);
        if (h && h.storage) {
          setStorage(h.storage);
          setSystemStats({
            cpu: typeof h.cpu_usage_percent === 'number' ? h.cpu_usage_percent.toFixed(1) : '--',
            up: typeof h.network?.up_mbps === 'number' ? h.network.up_mbps.toFixed(2) : '0.00',
            down: typeof h.network?.down_mbps === 'number' ? h.network.down_mbps.toFixed(2) : '0.00',
            latency: `${Math.round(performance.now() - started)}`,
          });
        }
      } catch {}
    };

    const token = localStorage.getItem('mview_token');
    const liveUrl = apiUrl(`/system/live${token ? `?token=${encodeURIComponent(token)}` : ''}`);
    const eventsSource = new EventSource(liveUrl);

    const handleSnapshot = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        applySnapshot(message.payload);
      } catch {}
    };

    eventsSource.addEventListener('snapshot', handleSnapshot);
    eventsSource.onerror = () => {
      eventsSource.close();
      load();
      fallbackTimer = window.setInterval(load, 15000);
    };

    return () => {
      eventsSource.close();
      if (fallbackTimer) window.clearInterval(fallbackTimer);
    };
  }, []);

  const onlineCams = cameras.filter(c => c.status !== 'offline').length;
  const unreadEvents = events.length;

  const navItems: NavItem[] = [
    { to: '/',         label: 'Dashboard',  icon: <LayoutDashboard size={16} />, end: true  },
    { to: '/live',     label: 'Live View',  icon: <Video           size={16} />, end: false },
    { to: '/playback', label: 'Playback',   icon: <PlaySquare      size={16} />, end: false },
    { to: '/events',   label: 'Events',     icon: <Bell            size={16} />, end: false, badge: unreadEvents || undefined },
    { to: '/map',      label: 'Map',        icon: <MapIcon         size={16} />, end: false },
    { to: '/settings', label: 'Settings',   icon: <SettingsIcon    size={16} />, end: false },
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
          <a
            key={item.to}
            href={item.to}
            className={`nav-item${isActivePath(currentPath, item) ? ' active' : ''}`}
            onClick={(event) => {
              event.preventDefault();
              navigateTo(item.to);
            }}
          >
            {item.icon}
            {item.label}
            {item.badge ? <span className="nav-badge">{item.badge > 99 ? '99+' : item.badge}</span> : null}
          </a>
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
          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 4, columnGap: 8, fontSize: '0.66rem', color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>
            <span>CPU</span><span style={{ color: 'var(--t2)' }}>{systemStats.cpu}%</span>
            <span>Up</span><span style={{ color: 'var(--cyan)' }}>{systemStats.up} Mbps</span>
            <span>Down</span><span style={{ color: 'var(--cyan)' }}>{systemStats.down} Mbps</span>
            <span>Latency</span><span style={{ color: 'var(--t2)' }}>{systemStats.latency} ms</span>
            <span>Codec</span><span style={{ color: 'var(--green)' }}>H.264</span>
          </div>
        </div>
      </nav>

      {/* Storage footer */}
      <div className="sidebar-footer">
        <div className="storage-label">
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <HardDrive size={12} /> Storage
          </span>
          <span>{storage ? `${storage.usage_percent}%` : '--'}</span>
        </div>
        <div className="storage-bar">
          <div className="storage-bar-fill" style={{ width: `${storage ? storage.usage_percent : 0}%` }} />
        </div>
        {storage && (
          <div style={{ fontSize: '0.65rem', color: 'var(--t3)', textAlign: 'right', marginTop: '-4px', fontFamily: 'monospace' }}>
            {recordingStorage ? `${recordingStorage.total_gb} GB archive` : `${storage.used_gb} GB used`}
            <br />
            {storage.used_gb} GB / {storage.total_gb} GB disk
          </div>
        )}

        <button className="nav-item" style={{ color: 'var(--t3)', marginTop: 6 }} onClick={onLogout}>
          <LogOut size={15} /> Logout
        </button>
      </div>
    </div>
  );
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('mview_token'));
  const [currentPath, setCurrentPath] = useState(normalizePath(window.location.pathname));

  useEffect(() => {
    const handleStorage = () => {
      setToken(localStorage.getItem('mview_token'));
    };
    const handleRoute = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('popstate', handleRoute);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('popstate', handleRoute);
    };
  }, []);

  const handleLogin = (t: string) => {
    localStorage.setItem('mview_token', t);
    setToken(t);
  };

  const handleLogout = () => {
    localStorage.removeItem('mview_token');
    setToken(null);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  if (window.location.pathname === '/wallboard') {
    return (
      <Suspense fallback={<div className="empty">Loading...</div>}>
        <Wallboard />
      </Suspense>
    );
  }

  const routes: Record<string, React.ReactNode> = {
    '/': <Dashboard />,
    '/live': <LiveView />,
    '/playback': <Playback />,
    '/events': <Events />,
    '/map': <MapView />,
    '/settings': <Settings />,
  };

  return (
    <div className="app-shell">
      <Sidebar onLogout={handleLogout} currentPath={currentPath} />
      <div className="main-content">
        <Suspense fallback={<div className="empty">Loading...</div>}>
          {routes[currentPath] ?? <Dashboard />}
        </Suspense>
      </div>
    </div>
  );
}

export default App;
