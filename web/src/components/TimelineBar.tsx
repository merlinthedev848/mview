import React from 'react';

interface TimelineEvent {
  id: string;
  type: 'motion' | 'person' | 'vehicle' | 'animal';
  timestamp: number;
  duration: number;
}

interface TimelineBarProps {
  events: TimelineEvent[];
  currentTime: number;
  onTimeSelect: (time: number) => void;
}

const TimelineBar: React.FC<TimelineBarProps> = ({ events, currentTime, onTimeSelect }) => {
  // A robust implementation would use a canvas or a complex div structure
  // to render zoomable timeline blocks. This is a visual stub for the stunning UI.
  
  return (
    <div style={{
      width: '100%',
      height: '100px',
      background: 'rgba(0,0,0,0.5)',
      borderRadius: '12px',
      border: '1px solid var(--surface-border)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end'
    }}>
      {/* Time Ticks */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', padding: '0 10px', fontSize: '10px', color: 'var(--text-muted)', alignItems: 'center' }}>
        <span>12:00</span>
        <span>12:15</span>
        <span>12:30</span>
        <span>12:45</span>
        <span>13:00</span>
      </div>

      {/* Events Layer */}
      <div style={{ position: 'absolute', top: '25px', left: 0, right: 0, height: '40px' }}>
        <div style={{ position: 'absolute', left: '20%', width: '2px', height: '15px', background: 'var(--color-danger)', top: '10px', borderRadius: '2px', boxShadow: '0 0 8px var(--color-danger)' }}></div>
        <div style={{ position: 'absolute', left: '21%', width: '2px', height: '15px', background: 'var(--color-danger)', top: '10px', borderRadius: '2px', boxShadow: '0 0 8px var(--color-danger)' }}></div>
        <div style={{ position: 'absolute', left: '45%', width: '2px', height: '15px', background: 'var(--color-primary)', top: '10px', borderRadius: '2px', boxShadow: '0 0 8px var(--color-primary)' }}></div>
        <div style={{ position: 'absolute', left: '75%', width: '2px', height: '15px', background: 'var(--color-accent)', top: '10px', borderRadius: '2px', boxShadow: '0 0 8px var(--color-accent)' }}></div>
      </div>

      {/* Continuous Recording Block Layer */}
      <div style={{ width: '100%', height: '30px', background: 'rgba(0, 212, 255, 0.1)', display: 'flex' }}>
        <div style={{ width: '15%', height: '100%', background: 'rgba(0, 212, 255, 0.2)', borderRight: '1px solid rgba(0,0,0,0.5)' }}></div>
        <div style={{ width: '35%', height: '100%', background: 'rgba(0, 212, 255, 0.2)', borderRight: '1px solid rgba(0,0,0,0.5)' }}></div>
        <div style={{ width: '5%', height: '100%', background: 'transparent' }}></div> {/* Gap */}
        <div style={{ width: '45%', height: '100%', background: 'rgba(0, 212, 255, 0.2)' }}></div>
      </div>

      {/* Playhead */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        bottom: 0,
        width: '2px',
        background: '#fff',
        boxShadow: '0 0 10px #fff',
        zIndex: 20
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: '-5px',
          width: '12px',
          height: '12px',
          background: '#fff',
          borderRadius: '50%'
        }}></div>
      </div>
    </div>
  );
};

export default TimelineBar;
