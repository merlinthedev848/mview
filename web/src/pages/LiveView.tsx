import React, { useState } from 'react';
import { Grid, Grid3x3, LayoutGrid, Maximize, Settings2 } from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';

// Mock cameras mapped from our backend
const liveCameras = [
  { id: '1', name: 'Front Door', status: 'recording' as const, hasMotion: false },
  { id: '2', name: 'Driveway', status: 'recording' as const, hasMotion: true },
  { id: '3', name: 'Back Garden', status: 'online' as const, hasMotion: false },
  { id: '4', name: 'Side Gate', status: 'offline' as const, hasMotion: false },
  { id: '5', name: 'Garage Indoor', status: 'online' as const, hasMotion: false },
  { id: '6', name: 'Patio', status: 'recording' as const, hasMotion: false },
];

const LiveView = () => {
  const [gridLayout, setGridLayout] = useState(2); // 1, 2 (2x2), 3 (3x3)
  
  return (
    <div style={{ padding: '2rem', height: '100vh', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2rem', margin: 0 }}>Live View</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Sub-second WebRTC streaming</p>
        </div>
        
        <div className="glass-panel" style={{ display: 'flex', padding: '0.5rem', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginRight: '0.5rem' }}>Layout:</span>
          <button 
            onClick={() => setGridLayout(1)}
            style={{ 
              background: gridLayout === 1 ? 'var(--color-primary)' : 'transparent', 
              border: 'none', 
              color: gridLayout === 1 ? '#000' : 'var(--text-muted)',
              padding: '6px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <Maximize size={20} />
          </button>
          <button 
            onClick={() => setGridLayout(2)}
            style={{ 
              background: gridLayout === 2 ? 'var(--color-primary)' : 'transparent', 
              border: 'none', 
              color: gridLayout === 2 ? '#000' : 'var(--text-muted)',
              padding: '6px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <Grid size={20} />
          </button>
          <button 
            onClick={() => setGridLayout(3)}
            style={{ 
              background: gridLayout === 3 ? 'var(--color-primary)' : 'transparent', 
              border: 'none', 
              color: gridLayout === 3 ? '#000' : 'var(--text-muted)',
              padding: '6px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <Grid3x3 size={20} />
          </button>
          
          <div style={{ width: '1px', height: '20px', background: 'var(--surface-border)', margin: '0 8px' }}></div>
          
          <button style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '6px' }}>
            <Settings2 size={20} />
          </button>
        </div>
      </div>

      {/* Video Grid Area */}
      <div style={{ 
        flex: 1, 
        display: 'grid', 
        gridTemplateColumns: `repeat(${gridLayout}, 1fr)`,
        gridAutoRows: gridLayout === 1 ? '100%' : '1fr',
        gap: '1rem',
        minHeight: 0 // Crucial for grid to flex properly
      }}>
        {liveCameras.slice(0, gridLayout * gridLayout).map(cam => (
          <div key={cam.id} style={{ height: '100%' }}>
            <VideoPlayer 
              cameraId={cam.id}
              name={cam.name}
              status={cam.status}
              hasMotion={cam.hasMotion}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveView;
