import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, SafeAreaView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

// Mock events for the timeline
const mockEvents = [
  { id: '1', time: '10:15', type: 'person', color: '#f43f5e', pos: 20 },
  { id: '2', time: '11:42', type: 'vehicle', color: '#f59e0b', pos: 45 },
  { id: '3', time: '14:05', type: 'motion', color: '#00d4ff', pos: 60 },
];

export default function Playback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState('1x');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Smart Playback</Text>
          <Text style={styles.subtitle}>Front Door (Today, Jun 5)</Text>
        </View>
      </View>

      {/* Main Video Area */}
      <View style={styles.videoContainer}>
        <Text style={{ fontSize: 48, opacity: 0.2 }}>🎥</Text>
        <Text style={styles.timestampOverlay}>14:32:45 REC</Text>
      </View>

      {/* Playback Controls & Timeline Area */}
      <View style={styles.controlsContainer}>
        
        {/* The Timeline Scrubber */}
        <View style={styles.timelineWrapper}>
          <View style={styles.timeLabels}>
            <Text style={styles.timeText}>00:00</Text>
            <Text style={styles.timeText}>12:00</Text>
            <Text style={styles.timeText}>24:00</Text>
          </View>
          
          <View style={styles.timelineTrack}>
            {/* Background continuous recording representation */}
            <View style={styles.recordingBar} />
            
            {/* Event Markers */}
            {mockEvents.map(event => (
              <View 
                key={event.id} 
                style={[styles.eventMarker, { left: `${event.pos}%`, backgroundColor: event.color }]} 
              />
            ))}
            
            {/* Playhead */}
            <View style={[styles.playhead, { left: '60%' }]}>
              <View style={styles.playheadKnob} />
            </View>
          </View>
        </View>

        {/* Transport Controls */}
        <View style={styles.transportControls}>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.iconText}>⏮</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.playPauseBtn}
            onPress={() => setIsPlaying(!isPlaying)}
          >
            <Text style={styles.playPauseText}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.iconText}>⏭</Text>
          </TouchableOpacity>
        </View>

        {/* Speed Selector */}
        <View style={styles.speedSelector}>
          {['0.5x', '1x', '2x', '4x'].map(s => (
            <TouchableOpacity 
              key={s} 
              style={[styles.speedBtn, speed === s && styles.speedBtnActive]}
              onPress={() => setSpeed(s)}
            >
              <Text style={[styles.speedText, speed === s && styles.speedTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  subtitle: {
    fontSize: 14,
    color: '#00d4ff', // Electric cyan for the selected camera
    marginTop: 4,
    fontWeight: '600',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#050505',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  timestampOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  controlsContainer: {
    height: 250,
    backgroundColor: '#12121a',
    padding: 20,
  },
  timelineWrapper: {
    marginBottom: 30,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeText: {
    color: '#64748b',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  timelineTrack: {
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
    justifyContent: 'center',
  },
  recordingBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  eventMarker: {
    position: 'absolute',
    width: 3,
    height: '80%',
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  playhead: {
    position: 'absolute',
    width: 2,
    height: 50,
    backgroundColor: '#fff',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  playheadKnob: {
    position: 'absolute',
    top: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  transportControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
    marginBottom: 20,
  },
  iconBtn: {
    padding: 10,
  },
  iconText: {
    fontSize: 24,
    color: '#e2e8f0',
  },
  playPauseBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#00d4ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  playPauseText: {
    fontSize: 28,
    color: '#000',
    marginLeft: 2, // optical alignment for play triangle
  },
  speedSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 4,
    alignSelf: 'center',
  },
  speedBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  speedBtnActive: {
    backgroundColor: '#3b82f6', // Vivid blue accent for playback speed
  },
  speedText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 12,
  },
  speedTextActive: {
    color: '#fff',
  }
});
