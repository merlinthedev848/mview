import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, RotateCw, SkipBack, SkipForward, 
  Search, Video, Download, Maximize2 
} from 'lucide-react';

const API = () => `http://${window.location.hostname}:8000`;

interface Camera {
  id: string;
  name: string;
  rtsp_url_main: string;
  rtsp_url_sub?: string;
  status: string;
  resolution?: string;
}

interface RecordingFile {
  camera_id: string;
  filename: string;
  path: string;
  size_mb: number;
  created_at: string;
  url: string;
  startTimestamp: number;
  endTimestamp: number;
}

interface CameraEvent {
  id: string;
  timestamp: string;
  timestampMs: number;
  object_class: string;
  confidence: number;
}

const Playback: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCam, setSelectedCam] = useState<Camera | null>(null);
  const [recordings, setRecordings] = useState<RecordingFile[]>([]);
  const [events, setEvents] = useState<CameraEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'motion' | 'person' | 'vehicle'>('all');
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1); // default '1x' (speeds[1])
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [activeFile, setActiveFile] = useState<RecordingFile | null>(null);

  // Timeline window (default 6-hour range)
  const [timelineStart, setTimelineStart] = useState<number>(Date.now() - 3 * 3600 * 1000);
  const [timelineEnd, setTimelineEnd] = useState<number>(Date.now() + 3 * 3600 * 1000);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const pendingSeek = useRef<number | null>(null);

  const speeds = [0.5, 1, 2, 4, 8, 16];

  // ── 1. Load initial cameras list ───────────────────────────────────
  useEffect(() => {
    const loadCameras = async () => {
      try {
        const res = await fetch(`${API()}/cameras`);
        if (res.ok) {
          const data = await res.json();
          setCameras(data);
          if (data.length > 0) {
            setSelectedCam(data[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load cameras:", err);
      }
      setLoading(false);
    };
    loadCameras();
  }, []);

  // ── 2. Load recordings and events for selected camera ──────────────
  useEffect(() => {
    if (!selectedCam) return;

    const loadData = async () => {
      try {
        const [recRes, eventRes] = await Promise.all([
          fetch(`${API()}/recordings-list?camera_id=${selectedCam.id}`),
          fetch(`${API()}/events?camera_id=${selectedCam.id}&limit=200`)
        ]);

        let recs: RecordingFile[] = [];
        if (recRes.ok) {
          const rawRecs = await recRes.json();
          recs = rawRecs.map((r: any) => {
            // Parse start timestamp from filename: YYYY-MM-DD_HH-MM-SS.mp4
            const match = r.filename.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/);
            let start = new Date(r.created_at).getTime();
            if (match) {
              const [_, y, m, d, hr, min, sec] = match;
              start = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(hr), parseInt(min), parseInt(sec)).getTime();
            }
            return {
              ...r,
              startTimestamp: start,
              endTimestamp: start + 60 * 60 * 1000 // 1 hour segment duration
            };
          }).sort((a: any, b: any) => a.startTimestamp - b.startTimestamp);
          setRecordings(recs);
        }

        let evs: CameraEvent[] = [];
        if (eventRes.ok) {
          const rawEvents = await eventRes.json();
          evs = rawEvents.map((e: any) => ({
            ...e,
            timestampMs: new Date(e.timestamp).getTime()
          }));
          setEvents(evs);
        }

        // Initialize timeline and active file
        if (recs.length > 0) {
          // Select the latest file by default
          const latestFile = recs[recs.length - 1];
          setActiveFile(latestFile);
          
          const initialTime = latestFile.startTimestamp;
          setCurrentTimeMs(initialTime);

          // Center timeline on this segment
          setTimelineStart(initialTime - 2 * 3600 * 1000);
          setTimelineEnd(initialTime + 4 * 3600 * 1000);
        } else {
          setActiveFile(null);
          setCurrentTimeMs(0);
          setTimelineStart(Date.now() - 3 * 3600 * 1000);
          setTimelineEnd(Date.now() + 3 * 3600 * 1000);
        }
      } catch (err) {
        console.error("Error loading playback data:", err);
      }
    };

    loadData();
    setIsPlaying(false);
  }, [selectedCam]);

  // ── 3. Handle playback logic and seeks ─────────────────────────────
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speeds[speedIndex];
    }
  }, [speedIndex, activeFile]);

  const seekToTime = (targetTimeMs: number) => {
    // Find the file containing this time
    const file = recordings.find(r => targetTimeMs >= r.startTimestamp && targetTimeMs <= r.endTimestamp);
    if (file) {
      const offsetSeconds = (targetTimeMs - file.startTimestamp) / 1000;
      setActiveFile(file);
      setCurrentTimeMs(targetTimeMs);
      
      if (videoRef.current) {
        if (videoRef.current.src.includes(file.url)) {
          videoRef.current.currentTime = offsetSeconds;
        } else {
          pendingSeek.current = offsetSeconds;
        }
      }
    } else {
      setCurrentTimeMs(targetTimeMs);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !activeFile) return;
    const currentVideoTime = videoRef.current.currentTime;
    const updatedTimeMs = activeFile.startTimestamp + currentVideoTime * 1000;
    setCurrentTimeMs(updatedTimeMs);

    // If playhead goes beyond the timeline window, slide the timeline forward
    if (updatedTimeMs > timelineEnd - 30 * 1000) {
      const span = timelineEnd - timelineStart;
      setTimelineStart(updatedTimeMs - span * 0.1);
      setTimelineEnd(updatedTimeMs + span * 0.9);
    }
  };

  const handleLoadedMetadata = () => {
    if (pendingSeek.current !== null && videoRef.current) {
      videoRef.current.currentTime = pendingSeek.current;
      pendingSeek.current = null;
    }
    if (isPlaying && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleVideoEnded = () => {
    if (!activeFile) return;
    const currentIndex = recordings.findIndex(r => r.url === activeFile.url);
    if (currentIndex !== -1 && currentIndex < recordings.length - 1) {
      const nextFile = recordings[currentIndex + 1];
      setActiveFile(nextFile);
      setCurrentTimeMs(nextFile.startTimestamp);
      pendingSeek.current = 0;
    } else {
      setIsPlaying(false);
    }
  };

  // ── 4. Transport Control Handlers ──────────────────────────────────
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  };

  const handleRewind30 = () => {
    if (!videoRef.current || !activeFile) return;
    const targetTime = videoRef.current.currentTime - 30;
    if (targetTime >= 0) {
      videoRef.current.currentTime = targetTime;
    } else {
      const currentIdx = recordings.findIndex(r => r.url === activeFile.url);
      if (currentIdx > 0) {
        const prevFile = recordings[currentIdx - 1];
        setActiveFile(prevFile);
        pendingSeek.current = 3600 + targetTime; 
      } else {
        videoRef.current.currentTime = 0;
      }
    }
  };

  const handleForward30 = () => {
    if (!videoRef.current || !activeFile) return;
    const targetTime = videoRef.current.currentTime + 30;
    if (targetTime < videoRef.current.duration) {
      videoRef.current.currentTime = targetTime;
    } else {
      const currentIdx = recordings.findIndex(r => r.url === activeFile.url);
      if (currentIdx !== -1 && currentIdx < recordings.length - 1) {
        const nextFile = recordings[currentIdx + 1];
        const rolloverSecs = targetTime - videoRef.current.duration;
        setActiveFile(nextFile);
        pendingSeek.current = rolloverSecs;
      }
    }
  };

  const handlePrevSegment = () => {
    if (!activeFile) return;
    const currentIdx = recordings.findIndex(r => r.url === activeFile.url);
    if (currentIdx > 0) {
      const prevFile = recordings[currentIdx - 1];
      setActiveFile(prevFile);
      setCurrentTimeMs(prevFile.startTimestamp);
      pendingSeek.current = 0;
    }
  };

  const handleNextSegment = () => {
    if (!activeFile) return;
    const currentIdx = recordings.findIndex(r => r.url === activeFile.url);
    if (currentIdx !== -1 && currentIdx < recordings.length - 1) {
      const nextFile = recordings[currentIdx + 1];
      setActiveFile(nextFile);
      setCurrentTimeMs(nextFile.startTimestamp);
      pendingSeek.current = 0;
    }
  };

  // ── 5. Timeline Click coordinates mapping ─────────────────────────
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickRatio = clickX / rect.width;
    const targetTime = timelineStart + clickRatio * (timelineEnd - timelineStart);
    seekToTime(targetTime);
  };

  // ── 6. UI Mappings ────────────────────────────────────────────────
  const filteredCameras = cameras.filter(cam =>
    cam.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimeHM = (timeMs: number) => {
    if (!timeMs) return '--:--';
    return new Date(timeMs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeHMS = (timeMs: number) => {
    if (!timeMs) return '--:--:--';
    return new Date(timeMs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getPercentage = (timeMs: number) => {
    const total = timelineEnd - timelineStart;
    const val = timeMs - timelineStart;
    return Math.max(0, Math.min(100, (val / total) * 100));
  };

  // Generate hourly scale ticks
  const generateTicks = () => {
    const ticks = [];
    const interval = 30 * 60 * 1000; // 30 minutes
    let start = Math.ceil(timelineStart / interval) * interval;
    while (start <= timelineEnd) {
      ticks.push(start);
      start += interval;
    }
    return ticks;
  };

  // Categorize events
  const getEventClass = (cls: string) => {
    const c = cls.toLowerCase();
    if (c === 'person') return 'person';
    if (c === 'car' || c === 'truck' || c === 'bus' || c === 'vehicle') return 'vehicle';
    return 'motion';
  };

  const filteredEvents = events.filter(e => {
    if (activeFilter === 'all') return true;
    return getEventClass(e.object_class) === activeFilter;
  });

  return (
    <div className="playback-layout">
      {/* ── Left Sidebar: Camera List ── */}
      <div className="playback-sidebar">
        <div className="playback-search-box">
          <Search size={16} className="playback-search-icon" />
          <input 
            type="text" 
            className="playback-search-input" 
            placeholder="Search cameras..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="playback-camera-list">
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)' }}>
              <div className="spinner" style={{ margin: '0 auto 10px' }} />
              Loading cameras...
            </div>
          ) : filteredCameras.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)' }}>No cameras found</div>
          ) : (
            filteredCameras.map(cam => (
              <div 
                key={cam.id} 
                className={`playback-camera-item${selectedCam?.id === cam.id ? ' active' : ''}`}
                onClick={() => setSelectedCam(cam)}
              >
                <div className="playback-camera-info">
                  <Video size={16} />
                  <span className="playback-camera-name">{cam.name}</span>
                </div>
                {cam.status === 'recording' && (
                  <span style={{ width: 8, height: 8, background: 'var(--red)', borderRadius: '50%', boxShadow: '0 0 8px var(--red)', display: 'inline-block' }} />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Right Content Area ── */}
      <div className="playback-main">
        {/* Video Player */}
        <div className="playback-video-container">
          {activeFile ? (
            <>
              {/* Top Custom Metadata Text Overlay */}
              <div style={{ position: 'absolute', top: 16, left: 20, zIndex: 10, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                <h2 style={{ fontSize: '1rem', color: '#fff', fontWeight: 700, margin: 0 }}>{selectedCam?.name}</h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--t2)' }}>{selectedCam?.resolution || '1080p'} recorded footage</span>
              </div>
              <div style={{ position: 'absolute', top: 16, right: 20, zIndex: 10, fontSize: '1rem', color: '#fff', fontWeight: 600, fontFamily: 'JetBrains Mono', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                {formatTimeHMS(currentTimeMs)}
              </div>

              <video
                ref={videoRef}
                key={activeFile.url}
                src={`${API()}${activeFile.url}`}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleVideoEnded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onClick={handlePlayPause}
                style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
              />

              {/* Bottom Custom Play Bar overlay */}
              <div className="playback-metadata-overlay">
                <button 
                  onClick={handlePlayPause}
                  style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                
                <span style={{ fontSize: '0.8rem', color: '#fff', marginRight: 'auto', marginLeft: 12, fontWeight: 500 }}>
                  Main Video Player
                </span>

                <div className="playback-pills">
                  <div className="playback-pill">Time</div>
                  <div className="playback-pill">{selectedCam?.name}</div>
                  <div className="playback-pill">{selectedCam?.resolution || '1080p'}</div>
                  {selectedCam?.status === 'recording' && (
                    <div className="playback-pill danger">
                      <span style={{ width: 6, height: 6, background: 'var(--red)', borderRadius: '50%', display: 'inline-block', animation: 'heartbeat 1.5s infinite' }} />
                      Rec
                    </div>
                  )}
                  <button 
                    style={{ background: 'transparent', border: 'none', color: 'var(--t2)', cursor: 'pointer', padding: 4 }}
                    onClick={() => videoRef.current?.requestFullscreen()}
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--t3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Video size={48} strokeWidth={1} />
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--t2)' }}>No recordings available</div>
              <div style={{ fontSize: '0.8rem' }}>Choose another camera or ensure recording is active.</div>
            </div>
          )}
        </div>

        {/* Timeline Section */}
        <div className="playback-timeline-section">
          <div className="playback-timeline-header">
            <h3 className="playback-timeline-title">Smart Playback Timeline</h3>
            <div className="playback-timeline-filters">
              <button 
                className={`filter-btn all${activeFilter === 'all' ? ' active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                All Events
              </button>
              <button 
                className={`filter-btn motion${activeFilter === 'motion' ? ' active' : ''}`}
                onClick={() => setActiveFilter('motion')}
              >
                Motion
              </button>
              <button 
                className={`filter-btn person${activeFilter === 'person' ? ' active' : ''}`}
                onClick={() => setActiveFilter('person')}
              >
                Person
              </button>
              <button 
                className={`filter-btn vehicle${activeFilter === 'vehicle' ? ' active' : ''}`}
                onClick={() => setActiveFilter('vehicle')}
              >
                Vehicle
              </button>
            </div>
          </div>

          {/* Timeline Viewport */}
          <div 
            className="timeline-viewport" 
            ref={timelineRef}
            onClick={handleTimelineClick}
          >
            {/* Visual labels on tracks */}
            <div className="timeline-track-label motion">Motion</div>
            <div className="timeline-track-label person">Person</div>
            <div className="timeline-track-label recording">Footage</div>
            <div className="timeline-track-label vehicle">Vehicle</div>

            {/* Continuous footage bar */}
            {recordings.map((rec, i) => {
              if (rec.endTimestamp < timelineStart || rec.startTimestamp > timelineEnd) return null;
              const left = getPercentage(rec.startTimestamp);
              const right = getPercentage(rec.endTimestamp);
              const width = right - left;
              return (
                <div 
                  key={i} 
                  className="timeline-recording-bar"
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              );
            })}

            {/* Event Capsules */}
            {filteredEvents.map((ev, i) => {
              // visual event capsule is 2.5 minutes wide
              const durationMs = 2.5 * 60 * 1000;
              const start = ev.timestampMs - durationMs / 2;
              const end = ev.timestampMs + durationMs / 2;
              if (end < timelineStart || start > timelineEnd) return null;

              const left = getPercentage(start);
              const right = getPercentage(end);
              const width = right - left;
              const evClass = getEventClass(ev.object_class);

              return (
                <div 
                  key={i}
                  className={`timeline-event-pill ${evClass}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  {/* Small tag indicator inside viewport on hover */}
                  <div className="timeline-event-tag">
                    {ev.object_class} ({formatTimeHMS(ev.timestampMs)})
                  </div>
                </div>
              );
            })}

            {/* Time Axis Ticks */}
            <div className="timeline-ticks-layer">
              {generateTicks().map((t, idx) => {
                const left = getPercentage(t);
                return (
                  <React.Fragment key={idx}>
                    <div className="timeline-tick-line" style={{ left: `${left}%` }} />
                    <span className="timeline-tick-label" style={{ left: `${left}%` }}>
                      {formatTimeHM(t)}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Dynamic Playhead */}
            {currentTimeMs > timelineStart && currentTimeMs < timelineEnd && (
              <div 
                className="timeline-playhead" 
                style={{ left: `${getPercentage(currentTimeMs)}%` }}
              >
                <div className="timeline-playhead-cap">
                  {formatTimeHMS(currentTimeMs)}
                </div>
              </div>
            )}
          </div>

          {/* Timeline Controls & Speed Selector Row */}
          <div className="playback-controls-section">
            {/* Transport Controls Bar */}
            <div className="transport-pill">
              <button className="transport-btn" onClick={handleRewind30} title="-30s">
                <RotateCcw size={16} />
                <span style={{ fontSize: '0.62rem', marginLeft: 4, fontWeight: 'bold' }}>30s</span>
              </button>
              <button className="transport-btn" onClick={handlePrevSegment} title="Prev Segment">
                <SkipBack size={16} />
              </button>
              <button 
                className="transport-btn play-pause" 
                onClick={handlePlayPause}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button className="transport-btn" onClick={handleNextSegment} title="Next Segment">
                <SkipForward size={16} />
              </button>
              <button className="transport-btn" onClick={handleForward30} title="+30s">
                <span style={{ fontSize: '0.62rem', marginRight: 4, fontWeight: 'bold' }}>30s</span>
                <RotateCw size={16} />
              </button>
            </div>

            {/* Playback Speed Selector */}
            <div className="speed-panel">
              <span className="speed-title">Playback Speed Selector</span>
              <div className="speed-slider-wrap">
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  step="1"
                  value={speedIndex}
                  onChange={e => setSpeedIndex(parseInt(e.target.value))}
                  style={{ accentColor: 'var(--cyan)', cursor: 'pointer', width: '100%' }}
                />
                <div className="speed-labels">
                  {speeds.map((s, idx) => (
                    <span 
                      key={idx} 
                      className={speedIndex === idx ? 'active' : ''}
                      onClick={() => setSpeedIndex(idx)}
                      style={{ cursor: 'pointer' }}
                    >
                      {s}x
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Playback;
