import React, { useState, useEffect } from 'react';
import { Search, Plus, CheckCircle, Shield, Settings2, Video, HardDrive } from 'lucide-react';

const DiscoveryModal = ({ onClose }: { onClose: () => void }) => {
  const [isScanning, setIsScanning] = useState(true);
  const [discovered, setDiscovered] = useState<any[]>([]);

  useEffect(() => {
    // Simulate network scan
    const timer = setTimeout(() => {
      setDiscovered([
        { id: 1, ip: '192.168.1.101', brand: 'Hikvision', model: 'DS-2CD2043G0-I', streams: '4K / 1080p', status: 'pending' },
        { id: 2, ip: '192.168.1.105', brand: 'Dahua', model: 'IPC-HFW4431R-Z', streams: '4MP / 720p', status: 'pending' },
        { id: 3, ip: '192.168.1.110', brand: 'Reolink', model: 'RLC-810A', streams: '4K / 480p', status: 'pending' }
      ]);
      setIsScanning(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleAdopt = (id: number) => {
    setDiscovered(prev => prev.map(cam => cam.id === id ? { ...cam, status: 'adopting' } : cam));
    setTimeout(() => {
      setDiscovered(prev => prev.map(cam => cam.id === id ? { ...cam, status: 'adopted' } : cam));
    }, 1500);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="glass-panel" style={{ width: '800px', maxWidth: '90vw', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Search color="var(--color-primary)" /> Auto-Discover Cameras
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
        </div>

        {isScanning ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', gap: '1rem' }}>
            {/* Custom pure CSS radar scan animation */}
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(0, 212, 255, 0.1)', position: 'relative', overflow: 'hidden', border: '1px solid var(--color-primary)' }}>
              <div style={{ position: 'absolute', top: 0, left: '50%', width: '50%', height: '50%', background: 'linear-gradient(to right, rgba(0,212,255,0), rgba(0,212,255,0.8))', transformOrigin: 'bottom left', animation: 'scan-radar 2s linear infinite' }}></div>
            </div>
            <p style={{ color: 'var(--color-primary)' }}>Scanning local network via ONVIF WS-Discovery...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--color-success)' }}>Found {discovered.length} compatible devices.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {discovered.map(cam => (
                <div key={cam.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                  <div>
                    <strong style={{ fontSize: '1.1rem' }}>{cam.brand} {cam.model}</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <span>IP: {cam.ip}</span>
                      <span>Streams: {cam.streams}</span>
                    </div>
                  </div>
                  <div>
                    {cam.status === 'pending' && (
                      <button className="btn-primary" onClick={() => handleAdopt(cam.id)}>Adopt</button>
                    )}
                    {cam.status === 'adopting' && (
                      <button className="btn-primary" disabled style={{ opacity: 0.7 }}>Adopting...</button>
                    )}
                    {cam.status === 'adopted' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-success)', fontWeight: 'bold' }}>
                        <CheckCircle size={20} /> Adopted
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isScanning && discovered.some(c => c.status === 'pending') && (
          <div style={{ alignSelf: 'flex-end', marginTop: '1rem' }}>
            <button className="btn-success" onClick={() => discovered.forEach(c => c.status === 'pending' && handleAdopt(c.id))}>
              Adopt All Devices
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const Settings = () => {
  const [showDiscovery, setShowDiscovery] = useState(false);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '2rem' }}>System Settings</h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>
        {/* Settings Sidebar */}
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', height: 'fit-content' }}>
          <div style={{ padding: '0.75rem 1rem', background: 'var(--surface-glass-hover)', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}><Video size={18} /> Cameras</div>
          <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}><Shield size={18} /> AI Detection</div>
          <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}><HardDrive size={18} /> Storage</div>
          <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}><Settings2 size={18} /> General</div>
        </div>

        {/* Settings Content */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2>Configured Cameras</h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button style={{ background: 'transparent', border: '1px solid var(--surface-border)', color: '#fff', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Plus size={18} /> Add Manually
              </button>
              <button className="btn-primary" onClick={() => setShowDiscovery(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Search size={18} /> Discover Cameras
              </button>
            </div>
          </div>

          <p style={{ color: 'var(--text-muted)' }}>No cameras configured yet. Click "Discover Cameras" to automatically find and adopt devices on your local network.</p>
        </div>
      </div>

      {showDiscovery && <DiscoveryModal onClose={() => setShowDiscovery(false)} />}
    </div>
  );
};

export default Settings;
