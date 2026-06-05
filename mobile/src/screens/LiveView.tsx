import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

// Mock data for cameras
const mockCameras = [
  { id: '1', name: 'Front Door', status: 'recording', fps: 30, bitrate: '4.2 Mbps' },
  { id: '2', name: 'Driveway', status: 'recording', fps: 15, bitrate: '1.8 Mbps' },
  { id: '3', name: 'Back Garden', status: 'online', fps: 15, bitrate: '1.5 Mbps' },
  { id: '4', name: 'Side Gate', status: 'offline', fps: 0, bitrate: '0 Mbps' },
];

export default function LiveView() {
  const [gridSize, setGridSize] = useState<1 | 2>(1);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Live View</Text>
          <Text style={styles.subtitle}>{mockCameras.length} Cameras Connected</Text>
        </View>
        
        {/* Grid Toggle */}
        <View style={styles.gridToggle}>
          <TouchableOpacity 
            style={[styles.toggleBtn, gridSize === 1 && styles.toggleBtnActive]}
            onPress={() => setGridSize(1)}
          >
            <Text style={[styles.toggleText, gridSize === 1 && styles.toggleTextActive]}>1x1</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, gridSize === 2 && styles.toggleBtnActive]}
            onPress={() => setGridSize(2)}
          >
            <Text style={[styles.toggleText, gridSize === 2 && styles.toggleTextActive]}>2x2</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Camera Grid */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.gridContainer}>
          {mockCameras.map((cam) => {
            const isSingle = gridSize === 1;
            const cardWidth = isSingle ? '100%' : '48%';
            const cardHeight = isSingle ? 240 : 160;

            return (
              <View key={cam.id} style={[styles.cameraCard, { width: cardWidth, height: cardHeight }]}>
                {/* Simulated Video Feed Area */}
                <View style={styles.videoPlaceholder}>
                  <Text style={styles.videoIcon}>🎥</Text>
                  {cam.status === 'offline' && <Text style={styles.offlineText}>OFFLINE</Text>}
                </View>

                {/* OSD Overlay */}
                <View style={styles.osdTop}>
                  <Text style={styles.camName}>{cam.name}</Text>
                  {cam.status === 'recording' && <View style={styles.recordingDot} />}
                </View>
                
                <View style={styles.osdBottom}>
                  <Text style={styles.statsText}>{cam.fps} FPS • {cam.bitrate}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Floating PTZ Control Hint */}
      <View style={styles.floatingAction}>
        <Text style={styles.actionText}>Tap any camera for PTZ controls</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  gridToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 4,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)', // Cyan tint
  },
  toggleText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 12,
  },
  toggleTextActive: {
    color: '#00d4ff',
  },
  scrollContent: {
    padding: 10,
    paddingBottom: 80,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  cameraCard: {
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 5,
  },
  videoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIcon: {
    fontSize: 32,
    opacity: 0.2,
  },
  offlineText: {
    color: '#f43f5e',
    fontWeight: 'bold',
    marginTop: 8,
    letterSpacing: 2,
  },
  osdTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  camName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f43f5e',
    shadowColor: '#f43f5e',
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  osdBottom: {
    position: 'absolute',
    bottom: 10,
    left: 10,
  },
  statsText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  floatingAction: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  actionText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  }
});
