import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize, Calendar, FastForward, Bookmark, Download } from 'lucide-react';

export const Playback = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState('1x');

  // Simulated timeline markers
  const timelineMarkers = [
    { left: '10%', width: '5%', color: 'var(--color-primary)', label: 'Motion' },
    { left: '25%', width: '2%', color: 'var(--color-danger)', label: 'Person' },
    { left: '45%', width: '15%', color: 'var(--color-primary)', label: 'Motion' },
    { left: '65%', width: '3%', color: 'var(--color-warning)', label: 'Vehicle' },
    { left: '85%', width: '10%', color: 'var(--color-primary)', label: 'Motion' }
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2rem', margin: 0 }}>Smart Playback</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Review recorded footage with AI event markers</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select className="input-field" style={{ width: '200px' }} defaultValue="cam1">
            <option value="cam1">Front Door (4K)</option>
            <option value="cam2">Driveway</option>
            <option value="cam3">Back Garden</option>
          </select>
          <button className="btn btn-outline" style={{ background: 'var(--surface-glass)' }}>
            <Calendar size={18} /> Today, Jun 5
          </button>
        </div>
      </header>

      {/* Main Video Player Area */}
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ 
          flex: 1, 
          background: '#000', 
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: 'linear-gradient(45deg, #050505 25%, #0a0a0f 25%, #0a0a0f 50%, #050505 50%, #050505 75%, #0a0a0f 75%, #0a0a0f 100%)',
          backgroundSize: '40px 40px'
        }}>
          {/* Simulated Video Placeholder */}
          <div style={{ color: 'var(--surface-border-highlight)', textAlign: 'center' }}>
            <Play size={48} opacity={0.5} style={{ margin: '0 auto', marginBottom: '1rem' }}/>
            <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', letterSpacing: '2px' }}>14:32:45 REC</div>
          </div>

          {/* OSD (On Screen Display) */}
          <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', gap: '10px' }}>
            <span className="status-indicator recording" style={{ alignSelf: 'center' }}></span>
            <span style={{ color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontWeight: 600 }}>Front Door</span>
          </div>
          
          <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
            <button className="btn" style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '8px' }}>
              <Maximize size={18} />
            </button>
          </div>
        </div>

        {/* Playback Controls & Timeline */}
        <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.4)', borderTop: '1px solid var(--surface-border)' }}>
          {/* Timeline Bar */}
          <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
            {/* Time labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '8px', fontFamily: 'monospace' }}>
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>24:00</span>
            </div>
            
            {/* The Bar */}
            <div style={{ 
              height: '40px', 
              background: 'rgba(255,255,255,0.05)', 
              borderRadius: '6px', 
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              border: '1px solid var(--surface-border)'
            }}>
              {/* Continuous Recording Background */}
              <div style={{ position: 'absolute', top: '25%', height: '50%', left: '0', right: '0', background: 'rgba(255,255,255,0.1)' }}></div>
              
              {/* Event Markers */}
              {timelineMarkers.map((marker, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  top: '10%',
                  height: '80%',
                  left: marker.left,
                  width: marker.width,
                  background: marker.color,
                  borderRadius: '4px',
                  boxShadow: `0 0 10px ${marker.color}`
                }}></div>
              ))}
              
              {/* Playhead */}
              <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '60%',
                width: '2px',
                background: '#fff',
                boxShadow: '0 0 10px rgba(255,255,255,0.8)',
                zIndex: 10
              }}>
                <div style={{ position: 'absolute', top: '-6px', left: '-5px', width: '12px', height: '12px', background: '#fff', borderRadius: '50%' }}></div>
              </div>
            </div>
          </div>

          {/* Transport Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ padding: '8px 12px' }}><Bookmark size={18} /></button>
              <button className="btn btn-outline" style={{ padding: '8px 12px' }}><Download size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button className="btn btn-outline" style={{ border: 'none', background: 'transparent' }}>
                <SkipBack size={24} />
              </button>
              
              <button 
                className="btn btn-primary" 
                style={{ padding: '12px', borderRadius: '50%' }}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} fill="currentColor" />}
              </button>
              
              <button className="btn btn-outline" style={{ border: 'none', background: 'transparent' }}>
                <SkipForward size={24} />
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--surface-glass)', padding: '4px', borderRadius: '8px' }}>
              <FastForward size={16} color="var(--text-muted)" style={{ margin: '0 8px' }} />
              {['0.5x', '1x', '2x', '4x', '8x'].map(s => (
                <button 
                  key={s}
                  onClick={() => setSpeed(s)}
                  style={{ 
                    background: speed === s ? 'var(--color-primary)' : 'transparent',
                    color: speed === s ? '#000' : 'var(--text-muted)',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.8rem'
                  }}
                >{s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Playback;
