import React, { useState } from 'react';
import { Upload, Map as MapIcon, Crosshair, Save, AlertTriangle } from 'lucide-react';

export const MapView = () => {
  const [floorplan, setFloorplan] = useState<string | null>(null);
  const [cameras, setCameras] = useState([
    { id: '1', name: 'Front Door', x: 20, y: 30, rotation: 45, alert: true },
    { id: '2', name: 'Driveway', x: 70, y: 40, rotation: -20, alert: false },
  ]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        setFloorplan(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2rem', margin: 0 }}>Spatial Map View</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Drag and drop cameras onto your floorplan</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          {!floorplan && (
            <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
              <Upload size={18} /> Upload Floorplan
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>
          )}
          <button className="btn btn-primary"><Save size={18} /> Save Layout</button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '2rem', flex: 1, overflow: 'hidden' }}>
        {/* Toolbox Sidebar */}
        <div className="glass-panel" style={{ width: '250px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem', margin: 0 }}>Available Cameras</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--surface-border)', cursor: 'grab' }}>
              <Crosshair size={16} style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--color-primary)' }} />
              Back Garden
            </div>
            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--surface-border)', cursor: 'grab' }}>
              <Crosshair size={16} style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--color-primary)' }} />
              Side Gate
            </div>
          </div>
        </div>

        {/* Map Canvas */}
        <div className="glass-panel" style={{ 
          flex: 1, 
          position: 'relative', 
          background: floorplan ? `url(${floorplan}) center/contain no-repeat` : 'rgba(0,0,0,0.4)',
          border: '1px solid var(--surface-border-highlight)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          {!floorplan ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <MapIcon size={64} opacity={0.3} style={{ marginBottom: '1rem' }} />
              <h3>No Floorplan Loaded</h3>
              <p>Upload an image to start placing cameras</p>
            </div>
          ) : (
            <>
              {/* Radar Grid Overlay */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(var(--surface-border) 1px, transparent 1px), linear-gradient(90deg, var(--surface-border) 1px, transparent 1px)', backgroundSize: '50px 50px', opacity: 0.2 }}></div>
              
              {/* Placed Cameras */}
              {cameras.map(cam => (
                <div key={cam.id} style={{ 
                  position: 'absolute', 
                  left: `${cam.x}%`, 
                  top: `${cam.y}%`, 
                  transform: `translate(-50%, -50%)`,
                  zIndex: 10,
                  cursor: 'move'
                }}>
                  {/* Radar Cone (Flashing if alert) */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '150px',
                    height: '150px',
                    background: cam.alert ? 'radial-gradient(circle at center, rgba(244,63,94,0.4) 0%, transparent 70%)' : 'radial-gradient(circle at center, rgba(0,212,255,0.2) 0%, transparent 70%)',
                    transform: `translate(-50%, -50%) rotate(${cam.rotation}deg)`,
                    clipPath: 'polygon(50% 50%, 0 0, 100% 0)',
                    transformOrigin: 'center',
                    animation: cam.alert ? 'pulse-danger 1s infinite' : 'none'
                  }}></div>
                  
                  {/* Camera Icon */}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    background: cam.alert ? 'var(--color-danger)' : 'var(--color-primary)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: cam.alert ? '0 0 20px var(--color-danger)' : '0 0 10px var(--color-primary)',
                    position: 'relative',
                    zIndex: 2
                  }}>
                    {cam.alert ? <AlertTriangle size={18} color="#000" /> : <Crosshair size={18} color="#000" />}
                  </div>
                  
                  <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', marginTop: '4px', whiteSpace: 'nowrap' }}>
                    {cam.name}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapView;
