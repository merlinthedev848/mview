import React, { useState } from 'react';
import { Search, Filter, Calendar, Camera, User, Crosshair, Sparkles } from 'lucide-react';

const Events = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock events demonstrating the semantic search capability
  const mockEvents = [
    { id: '1', camera: 'Front Door', type: 'person', confidence: 0.98, time: '10 mins ago', desc: 'Person in red jacket', image: 'bg-red-900/20' },
    { id: '2', camera: 'Driveway', type: 'vehicle', confidence: 0.95, time: '1 hour ago', desc: 'Blue SUV entering', image: 'bg-blue-900/20' },
    { id: '3', camera: 'Back Garden', type: 'animal', confidence: 0.88, time: '2 hours ago', desc: 'Fox crossing lawn', image: 'bg-green-900/20' },
    { id: '4', camera: 'Front Door', type: 'person', confidence: 0.92, time: '4 hours ago', desc: 'Delivery driver with package', image: 'bg-amber-900/20' },
  ];

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 className="text-gradient" style={{ fontSize: '2rem', margin: 0 }}>Smart Events & Search</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Powered by CLIP Semantic Analysis</p>
      </div>

      {/* Semantic Search Bar */}
      <div className="glass-panel" style={{ 
        padding: '1rem', 
        display: 'flex', 
        gap: '1rem', 
        alignItems: 'center',
        background: 'linear-gradient(90deg, rgba(124, 58, 237, 0.1) 0%, rgba(0, 212, 255, 0.1) 100%)',
        border: '1px solid rgba(124, 58, 237, 0.3)'
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Sparkles size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-accent)' }} />
          <input 
            type="text" 
            placeholder='Semantic Search: Try "person in red jacket" or "white delivery van"...' 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '16px 16px 16px 48px',
              borderRadius: '8px',
              border: '1px solid var(--surface-border)',
              background: 'rgba(0,0,0,0.4)',
              color: '#fff',
              fontSize: '1.1rem',
              outline: 'none',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
            }}
          />
        </div>
        <button style={{ 
          padding: '16px 32px', 
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', 
          color: '#fff', 
          border: 'none', 
          borderRadius: '8px', 
          fontSize: '1.1rem',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 15px rgba(124, 58, 237, 0.4)'
        }}>
          <Search size={20} /> Search
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', border: '1px solid var(--surface-border)', color: 'var(--text-main)', cursor: 'pointer' }}>
          <Filter size={18} /> Filters
        </button>
        <button className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', border: '1px solid var(--surface-border)', color: 'var(--text-main)', cursor: 'pointer' }}>
          <Camera size={18} /> All Cameras
        </button>
        <button className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', border: '1px solid var(--surface-border)', color: 'var(--text-main)', cursor: 'pointer' }}>
          <Calendar size={18} /> Last 24 Hours
        </button>
        <button className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', border: '1px solid var(--surface-border)', color: 'var(--text-main)', cursor: 'pointer' }}>
          <User size={18} /> People
        </button>
      </div>

      {/* Events Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {mockEvents.map(event => (
          <div key={event.id} className="glass-panel" style={{ 
            overflow: 'hidden', 
            transition: 'transform 0.2s', 
            cursor: 'pointer' 
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {/* Thumbnail Placeholder */}
            <div className={event.image} style={{ height: '180px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Crosshair size={48} color="rgba(255,255,255,0.1)" />
              <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                {(event.confidence * 100).toFixed(0)}% Match
              </div>
            </div>
            
            {/* Details */}
            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase' }}>{event.type}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{event.time}</span>
              </div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>{event.desc}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Camera size={14} /> {event.camera}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Events;
