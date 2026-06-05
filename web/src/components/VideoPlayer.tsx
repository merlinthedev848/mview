import React, { useState } from 'react';
import { Camera, Maximize, Mic, Video as VideoIcon, Activity, Focus } from 'lucide-react';

interface VideoPlayerProps {
  cameraId: string;
  name: string;
  status: 'online' | 'offline' | 'recording';
  hasMotion?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ cameraId, name, status, hasMotion = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  // In a real implementation, this component would:
  // 1. Establish a WebRTC connection to go2rtc
  // 2. Render a <video> element with the incoming stream
  // 3. Handle connection drops and ICE negotiation

  return (
    <div 
      className="glass-panel"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '250px',
        background: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        border: hasMotion ? '2px solid var(--color-danger)' : '1px solid var(--surface-border)',
        transition: 'all 0.3s ease',
        boxShadow: hasMotion ? '0 0 20px rgba(244, 63, 94, 0.4)' : 'none'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Simulated Video Feed Area */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(45deg, #050508 0%, #1a1a24 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <VideoIcon size={48} color="rgba(255,255,255,0.05)" />
      </div>

      {/* Top Gradient Overlay */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '60px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
        zIndex: 10,
        padding: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className={`status-indicator ${status}`}></div>
          <span style={{ color: '#fff', fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
            {name}
          </span>
        </div>
        
        {hasMotion && (
          <div style={{ 
            background: 'var(--color-danger)', 
            color: '#fff', 
            padding: '2px 8px', 
            borderRadius: '4px', 
            fontSize: '0.75rem', 
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            animation: 'pulse-ring 2s infinite'
          }}>
            <Activity size={12} /> MOTION
          </div>
        )}
      </div>

      {/* Bottom Controls Overlay (Visible on Hover) */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: '50px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
        zIndex: 10,
        padding: '12px',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '12px',
        opacity: isHovered ? 1 : 0,
        transition: 'opacity 0.2s ease'
      }}>
        <button style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }} title="Focus Mode">
          <Focus size={18} />
        </button>
        <button style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }} title="Two-Way Audio">
          <Mic size={18} />
        </button>
        <button style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }} title="Snapshot">
          <Camera size={18} />
        </button>
        <button style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }} title="Fullscreen">
          <Maximize size={18} />
        </button>
      </div>
      
      {/* WebRTC performance overlay stub */}
      {isHovered && (
        <div style={{ position: 'absolute', top: '40px', left: '12px', zIndex: 10, color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
          WebRTC | 4K | 30fps | 1.2Mbps
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
