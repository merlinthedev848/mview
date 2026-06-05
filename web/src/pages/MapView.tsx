import React, { useState } from 'react';
import { Camera, Map as MapIcon, Upload, Layers, Plus } from 'lucide-react';

const MapView = () => {
  // Mock camera positions on a map (x, y percentages)
  const [cameras, setCameras] = useState([
    { id: '1', name: 'Front Door', x: 20, y: 80, status: 'recording', rotation: 45 },
    { id: '2', name: 'Driveway', x: 20, y: 95, status: 'online', rotation: 0 },
    { id: '3', name: 'Back Garden', x: 80, y: 15, status: 'recording', rotation: 225 },
  ]);

  return (
    <div style={{ padding: '2rem', height: '100vh', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2rem', margin: 0 }}>Site Map</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Interactive floor plan and camera placement</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1rem', border: '1px solid var(--surface-border)', color: 'var(--text-main)', cursor: 'pointer' }}>
            <Layers size={18} /> Floor: Ground
          </button>
          <button className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1rem', border: '1px solid var(--color-primary)', background: 'rgba(0, 212, 255, 0.1)', color: 'var(--color-primary)', cursor: 'pointer' }}>
            <Upload size={18} /> Upload Floor Plan
          </button>
        </div>
      </div>

      {/* Map Area */}
      <div className="glass-panel" style={{ 
        flex: 1, 
        minHeight: 0, 
        position: 'relative', 
        overflow: 'hidden',
        background: 'linear-gradient(45deg, #0a0a0f 25%, #12121a 25%, #12121a 50%, #0a0a0f 50%, #0a0a0f 75%, #12121a 75%, #12121a 100%)',
        backgroundSize: '40px 40px',
        border: '1px solid var(--surface-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        
        {/* Placeholder text if no map uploaded */}
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <MapIcon size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
          <h2>No Floor Plan Uploaded</h2>
          <p>Upload a PNG or JPEG blueprint to place cameras</p>
        </div>

        {/* Camera Markers */}
        {cameras.map(cam => (
          <div 
            key={cam.id}
            style={{
              position: 'absolute',
              left: `${cam.x}%`,
              top: `${cam.y}%`,
              transform: 'translate(-50%, -50%)',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            {/* Field of view cone indicator */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '100px',
              height: '100px',
              background: cam.status === 'recording' ? 'linear-gradient(to top, transparent, rgba(244, 63, 94, 0.2))' : 'linear-gradient(to top, transparent, rgba(0, 212, 255, 0.2))',
              clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
              transformOrigin: 'bottom center',
              transform: `translate(-50%, -100%) rotate(${cam.rotation}deg)`,
              pointerEvents: 'none'
            }}></div>

            {/* Camera Icon */}
            <div style={{
              width: '32px',
              height: '32px',
              background: '#000',
              border: `2px solid ${cam.status === 'recording' ? 'var(--color-danger)' : 'var(--color-primary)'}`,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: `0 0 10px ${cam.status === 'recording' ? 'rgba(244, 63, 94, 0.5)' : 'rgba(0, 212, 255, 0.5)'}`
            }}>
              <Camera size={16} color="#fff" />
            </div>
            
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.8)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
              marginTop: '4px',
              whiteSpace: 'nowrap',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              {cam.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapView;
