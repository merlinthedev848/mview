import React, { useState } from 'react';
import { Settings as SettingsIcon, Search, Plus, Save, Server, Shield, Bell } from 'lucide-react';

export const Settings = () => {
  const [activeTab, setActiveTab] = useState('cameras');
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredCameras, setDiscoveredCameras] = useState([]);

  const scanNetwork = async () => {
    setIsScanning(true);
    setDiscoveredCameras([]);
    try {
      // Hit the real FastAPI endpoint which triggers WS-Discovery
      const res = await fetch('http://localhost:8000/cameras/discover', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        // data should be an array of discovered ONVIF devices
        setDiscoveredCameras(data || []);
      }
    } catch (e) {
      console.error("Discovery failed", e);
    }
    setIsScanning(false);
  };

  const adoptCamera = async (cam: any) => {
    try {
      await fetch('http://localhost:8000/cameras/adopt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cam.url, username: 'admin', password: 'password' })
      });
      // Remove from discovered list once adopted
      setDiscoveredCameras(prev => prev.filter((c: any) => c.url !== cam.url));
      alert("Camera adopted successfully!");
    } catch (e) {
      alert("Failed to adopt camera.");
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '2rem', margin: 0 }}>System Configuration</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Manage hardware, AI pipelines, and rules</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>
        {/* Settings Sidebar */}
        <div className="glass-panel" style={{ padding: '1rem', height: 'fit-content' }}>
          {[
            { id: 'cameras', label: 'Cameras & Hardware', icon: <Server size={18} /> },
            { id: 'ai', label: 'AI & Detection', icon: <Shield size={18} /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
            { id: 'system', label: 'System', icon: <SettingsIcon size={18} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: activeTab === tab.id ? 'var(--surface-glass-hover)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--text-main)',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: activeTab === tab.id ? 600 : 500,
                transition: 'all 0.2s',
                marginBottom: '4px'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="glass-panel" style={{ padding: '2rem', minHeight: '600px' }}>
          {activeTab === 'cameras' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>Camera Management</h2>
                <button 
                  className="btn btn-primary" 
                  onClick={scanNetwork}
                  disabled={isScanning}
                >
                  <Search size={18} />
                  {isScanning ? 'Scanning Network...' : 'Auto-Discover ONVIF'}
                </button>
              </div>

              {/* Discovery Results */}
              {discoveredCameras.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: 'var(--color-accent)', marginBottom: '1rem' }}>Discovered Devices</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {discoveredCameras.map((cam: any, i: number) => (
                      <div key={i} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '1rem',
                        background: 'rgba(0,212,255,0.05)',
                        border: '1px solid var(--surface-border-highlight)',
                        borderRadius: '8px'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>ONVIF Device Found</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{cam.url}</div>
                        </div>
                        <button className="btn btn-primary" onClick={() => adoptCamera(cam)}>
                          <Plus size={16} /> Adopt
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '2rem' }}>
                <h3>Active Cameras</h3>
                <p style={{ color: 'var(--text-muted)' }}>No cameras configured yet. Use Auto-Discover to find local IP cameras.</p>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div>
              <h2>AI Pipeline Configuration</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Configure detection models and hardware acceleration.</p>
              
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
                  <h4>Object Detection Model</h4>
                  <select className="input-field" style={{ marginTop: '0.5rem' }} defaultValue="yolov8n">
                    <option value="yolov8n">YOLOv8 Nano (Fastest, CPU optimized)</option>
                    <option value="yolov8s">YOLOv8 Small (Balanced)</option>
                    <option value="yolo11n">YOLO11 Nano (Next-Gen)</option>
                  </select>
                </div>
                
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
                  <h4>Hardware Accelerator</h4>
                  <select className="input-field" style={{ marginTop: '0.5rem' }} defaultValue="auto">
                    <option value="auto">Auto-Detect (Recommended)</option>
                    <option value="cpu">CPU Only (ONNX Runtime)</option>
                    <option value="cuda">NVIDIA GPU (CUDA/TensorRT)</option>
                    <option value="openvino">Intel iGPU (OpenVINO)</option>
                  </select>
                </div>
                
                <button className="btn btn-primary" style={{ width: 'fit-content' }}>
                  <Save size={18} /> Save AI Config
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
