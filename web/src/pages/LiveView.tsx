import React, { useState, useEffect } from 'react';
import { Grid, Grid3x3, LayoutGrid, Maximize, Settings2 } from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';

const LiveView = () => {
  const [gridLayout, setGridLayout] = useState(2); // 1, 2 (2x2), 3 (3x3)
  const [liveCameras, setLiveCameras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const host = window.location.hostname;
        const res = await fetch(`http://${host}:8000/cameras`);
        if (res.ok) {
          const data = await res.json();
          setLiveCameras(data);
        }
      } catch (err) {
        console.error("Failed to fetch cameras:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCameras();
    const interval = setInterval(fetchCameras, 5000);
    return () => clearInterval(interval);
  }, []);
  
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
        {loading && liveCameras.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', gridColumn: `span ${gridLayout}`, paddingTop: '5rem' }}>
            Loading cameras...
          </div>
        ) : liveCameras.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', gridColumn: `span ${gridLayout}`, paddingTop: '5rem' }}>
            No cameras configured. Go to Settings to auto-discover ONVIF devices.
          </div>
        ) : (
          liveCameras.slice(0, gridLayout * gridLayout).map((cam: any) => (
            <div key={cam.id} style={{ height: '100%' }}>
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
  );
};

export default LiveView;
