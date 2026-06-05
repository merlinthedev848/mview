import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';

// Simple mocked connection context
// In a real app, this would use AsyncStorage to persist the URL
export default function App() {
  const [serverUrl, setServerUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = () => {
    if (!serverUrl) {
      setError('Please enter a server address');
      return;
    }

    // Format URL correctly
    let formattedUrl = serverUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `http://${formattedUrl}`;
    }

    setIsConnecting(true);
    setError(null);

    // Simulate API connection delay
    setTimeout(() => {
      // In reality, we'd ping formattedUrl + '/system/health'
      setIsConnecting(false);
      setIsConnected(true);
    }, 1500);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setServerUrl('');
  };

  // -------------------------------------------------------------
  // SCREEN: Server Setup
  // -------------------------------------------------------------
  if (!isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.glassPanel}>
            <View style={styles.iconPlaceholder}>
              <Text style={styles.iconText}>🛡️</Text>
            </View>
            
            <Text style={styles.title}>SentinelNVR</Text>
            <Text style={styles.subtitle}>Connect to your private NVR server</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>SERVER ADDRESS</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 192.168.1.100:8000"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={serverUrl}
                onChangeText={(text) => {
                  setServerUrl(text);
                  setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity 
              style={[styles.button, isConnecting && styles.buttonDisabled]} 
              onPress={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.buttonText}>Connect</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.footerText}>
              Your data never leaves your network unless you configure remote access.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // SCREEN: Dashboard (Placeholder)
  // -------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <Text style={[styles.title, { marginBottom: 0 }]}>Dashboard</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Connected</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Live Cameras</Text>
          <Text style={{ color: 'var(--text-muted, #a1a1aa)', marginTop: 10 }}>
            Connected to {serverUrl}
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#3f3f46', marginTop: 'auto' }]} 
          onPress={handleDisconnect}
        >
          <Text style={[styles.buttonText, { color: '#e4e4e7' }]}>Disconnect Server</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f', // Dark background matching web
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  glassPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#e2e8f0',
    fontSize: 16,
  },
  errorText: {
    color: '#f43f5e',
    fontSize: 14,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#00d4ff', // Electric cyan
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  footerText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    marginTop: 24,
    lineHeight: 18,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  statusText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  }
});
