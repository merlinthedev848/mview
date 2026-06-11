import React, { useState, useEffect, useRef } from 'react';
import { Camera, Maximize, Mic, Video as VideoIcon, Activity, Focus } from 'lucide-react';
import { go2rtcUrl } from '../lib/endpoints';

interface VideoPlayerProps {
  cameraId: string;
  name: string;
  status: 'online' | 'offline' | 'recording';
  hasMotion?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ cameraId, name, status, hasMotion = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (status === 'offline') return;

    let pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    const fallbackToHls = () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = go2rtcUrl(`/api/manifest.m3u8?src=${cameraId}`);
        videoRef.current.load();
        videoRef.current.play().catch(e => console.log("HLS play error:", e));
        setIsStreaming(true);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.warn("WebRTC connection failed/disconnected. Falling back to HLS...");
        fallbackToHls();
      }
    };

    pc.ontrack = (event) => {
      if (videoRef.current && videoRef.current.srcObject !== event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        setIsStreaming(true);
      }
    };

    const startStream = async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Fetch answer from go2rtc API.
        const response = await fetch(go2rtcUrl(`/api/webrtc?src=${cameraId}`), {
          method: 'POST',
          body: offer.sdp
        });

        if (response.ok) {
          const answerSdp = await response.text();
          await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
        } else {
          console.warn("WebRTC offer rejected, falling back to HLS");
          fallbackToHls();
        }
      } catch (err) {
        console.error("WebRTC Error for camera", cameraId, err);
        fallbackToHls();
      }
    };

    startStream();

    return () => {
      setIsStreaming(false);
      pc.close();
      if (videoRef.current) {
        videoRef.current.src = '';
      }
    };
  }, [cameraId, status]);

  return (
    <div 
      className="glass-panel"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '250px',
        background: 'var(--bg-dark-base)',
        borderRadius: '12px',
        overflow: 'hidden',
        border: hasMotion ? '2px solid var(--color-danger)' : '1px solid var(--surface-border)',
        transition: 'all 0.3s ease',
        boxShadow: hasMotion ? '0 0 20px rgba(244, 63, 94, 0.4)' : 'none'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video Element */}
      {status !== 'offline' ? (
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      ) : (
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
      )}

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
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {status === 'recording' && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.18)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              color: '#fff',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              letterSpacing: '0.5px',
              boxShadow: '0 0 12px rgba(244, 63, 94, 0.3)',
              backdropFilter: 'blur(4px)',
            }}>
              <span className="cam-rec-dot" style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#f43f5e',
                borderRadius: '50%',
                display: 'inline-block',
                boxShadow: '0 0 8px #f43f5e',
                animation: 'heartbeat 1.5s ease-in-out infinite'
              }}></span>
              REC
            </div>
          )}

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
      {isHovered && isStreaming && (
        <div style={{ position: 'absolute', top: '40px', left: '12px', zIndex: 10, color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
          WebRTC | Connected
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
