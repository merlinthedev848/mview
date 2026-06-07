import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { apiUrl } from '../lib/endpoints';

const Events: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(apiUrl('/events?limit=200'));
        if (res.ok) setEvents(await res.json());
      } catch {}
      setLoading(false);
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const typeColor = (cls: string) => {
    if (!cls) return 'var(--t3)';
    if (cls === 'person') return 'var(--cyan)';
    if (cls === 'vehicle' || cls === 'car') return 'var(--pink)';
    return 'var(--amber)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="topbar" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--t1)' }}>Event Log</h1>
        <span style={{ fontSize: '0.76rem', color: 'var(--t2)' }}>{events.length} events</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
        {loading ? (
          <div className="empty"><div className="spinner" /></div>
        ) : events.length === 0 ? (
          <div className="empty">
            <Bell size={38} strokeWidth={1} color="var(--t3)" />
            <div className="empty-title">No Events Yet</div>
            <div className="empty-sub">Events are logged here when the AI detector identifies objects in your camera feeds.</div>
          </div>
        ) : (
          <div className="card">
            {events.map((ev: any, i) => (
              <div key={ev.id ?? i} className="cam-row">
                <div className="event-dot"
                  style={{ background: typeColor(ev.object_class), boxShadow: `0 0 6px ${typeColor(ev.object_class)}` }}
                />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.84rem', textTransform: 'capitalize' }}>
                    {ev.object_class ?? ev.event_type ?? 'Event'}
                  </span>
                  {ev.camera_id && (
                    <span style={{ fontSize: '0.74rem', color: 'var(--t2)', marginLeft: 10 }}>
                      Camera {ev.camera_id.slice(0, 8)}…
                    </span>
                  )}
                </div>
                {ev.confidence != null && (
                  <span style={{
                    fontSize: '0.72rem', padding: '2px 9px', borderRadius: 20,
                    background: 'var(--cyan-dim)', color: 'var(--cyan)',
                    border: '1px solid var(--cyan-border)',
                  }}>
                    {Math.round(ev.confidence * 100)}%
                  </span>
                )}
                <span style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--t3)' }}>
                  {new Date(ev.timestamp ?? ev.created_at).toLocaleString('en-GB', {
                    day: '2-digit', month: 'short',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;
