import React, { useState } from 'react';
import { Calendar, Download, FastForward, Play, Rewind, SkipBack, SkipForward, Pause } from 'lucide-react';
import TimelineBar from '../components/TimelineBar';
import VideoPlayer from '../components/VideoPlayer';

const Playback = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  
  return (
    <div style={{ padding: '2rem', height: '100vh', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2rem', margin: 0 }}>Smart Playback</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Review recorded footage and AI events</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select className="glass-panel" style={{ padding: '0.75rem 1rem', border: '1px solid var(--surface-border)', color: 'var(--text-main)', outline: 'none', appearance: 'none', cursor: 'pointer', minWidth: '200px' }}>
            <option value="1">Front Door</option>
            <option value="2">Driveway</option>
            <option value="3">Back Garden</option>
          </select>
          
          <button className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', border: '1px solid var(--surface-border)', color: 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s' }}>
            <Calendar size={18} />
            Today
          </button>
          
          <button className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', border: '1px solid var(--color-primary)', background: 'rgba(0, 212, 255, 0.1)', color: 'var(--color-primary)', cursor: 'pointer', transition: 'all 0.2s' }}>
            <Download size={18} />
            Export Clip
          </button>
        </div>
      </div>

      {/* Main Video Area */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center', background: '#000', borderRadius: '12px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
        <VideoPlayer cameraId="1" name="Front Door - Playback" status="online" hasMotion={false} />
      </div>

      {/* Playback Controls & Timeline */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>12:30:45</span>
            <span style={{ color: 'var(--text-muted)' }}>/ 13:00:00</span>
          </div>
          
          {/* Transport Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><SkipBack size={24} /></button>
            <button style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}><Rewind size={24} /></button>
            
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-primary)', color: '#000', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 0 15px rgba(0,212,255,0.4)' }}
            >
              {isPlaying ? <Pause size={24} fill="#000" /> : <Play size={24} fill="#000" style={{ marginLeft: '4px' }} />}
            </button>
            
            <button style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}><FastForward size={24} /></button>
            <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><SkipForward size={24} /></button>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['0.5x', '1x', '2x', '4x', '8x'].map(speed => (
              <button key={speed} style={{ 
                background: speed === '1x' ? 'var(--surface-glass-hover)' : 'transparent',
                border: '1px solid var(--surface-border)',
                color: speed === '1x' ? '#fff' : 'var(--text-muted)',
                padding: '4px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.9rem'
              }}>
                {speed}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Bar */}
        <TimelineBar events={[]} currentTime={0} onTimeSelect={() => {}} />
      </div>
    </div>
  );
};

export default Playback;
