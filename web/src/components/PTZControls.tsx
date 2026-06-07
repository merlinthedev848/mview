import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Crosshair, ZoomIn, ZoomOut } from 'lucide-react';
import { apiUrl } from '../lib/endpoints';

interface PTZControlsProps {
  cameraId: string;
}

export const PTZControls: React.FC<PTZControlsProps> = ({ cameraId }) => {
  const handlePTZ = async (action: string) => {
    try {
      await fetch(apiUrl(`/cameras/${cameraId}/ptz/move`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, speed: 0.5 })
      });
    } catch (e) {
      console.error("PTZ Command Failed", e);
    }
  };

  const stopPTZ = async () => {
    try {
      await fetch(apiUrl(`/cameras/${cameraId}/ptz/stop`), {
        method: 'POST'
      });
    } catch (e) {
      console.error("PTZ Stop Failed", e);
    }
  };

  return (
    <div className="glass-panel" style={{ 
      padding: '1rem', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1rem',
      background: 'rgba(0,0,0,0.6)',
      border: '1px solid var(--surface-border-highlight)'
    }}>
      <div style={{ textAlign: 'center', fontWeight: 600, color: 'var(--color-primary)' }}>PTZ Control</div>
      
      {/* Joystick Cross */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', width: 'fit-content', margin: '0 auto' }}>
        <div></div>
        <button 
          className="btn btn-outline" 
          onMouseDown={() => handlePTZ('up')} 
          onMouseUp={stopPTZ}
          onMouseLeave={stopPTZ}
          style={{ padding: '12px' }}
        >
          <ArrowUp size={20} />
        </button>
        <div></div>
        
        <button 
          className="btn btn-outline" 
          onMouseDown={() => handlePTZ('left')} 
          onMouseUp={stopPTZ}
          onMouseLeave={stopPTZ}
          style={{ padding: '12px' }}
        >
          <ArrowLeft size={20} />
        </button>
        <button className="btn btn-outline" style={{ padding: '12px', background: 'rgba(0,212,255,0.1)', color: 'var(--color-primary)' }}>
          <Crosshair size={20} />
        </button>
        <button 
          className="btn btn-outline" 
          onMouseDown={() => handlePTZ('right')} 
          onMouseUp={stopPTZ}
          onMouseLeave={stopPTZ}
          style={{ padding: '12px' }}
        >
          <ArrowRight size={20} />
        </button>
        
        <div></div>
        <button 
          className="btn btn-outline" 
          onMouseDown={() => handlePTZ('down')} 
          onMouseUp={stopPTZ}
          onMouseLeave={stopPTZ}
          style={{ padding: '12px' }}
        >
          <ArrowDown size={20} />
        </button>
        <div></div>
      </div>

      {/* Zoom Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', borderTop: '1px solid var(--surface-border)', paddingTop: '1rem' }}>
        <button 
          className="btn btn-outline"
          onMouseDown={() => handlePTZ('zoom_in')} 
          onMouseUp={stopPTZ}
          onMouseLeave={stopPTZ}
        >
          <ZoomIn size={18} /> Zoom
        </button>
        <button 
          className="btn btn-outline"
          onMouseDown={() => handlePTZ('zoom_out')} 
          onMouseUp={stopPTZ}
          onMouseLeave={stopPTZ}
        >
          <ZoomOut size={18} /> Zoom
        </button>
      </div>
    </div>
  );
};

export default PTZControls;
