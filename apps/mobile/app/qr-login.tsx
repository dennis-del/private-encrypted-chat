import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from "expo-linear-gradient";
import Toast from 'react-native-toast-message';

export default function QRLoginScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  async function onScan({ data }: any) {
    if (scanned) return;
    setScanned(true);

    try {
      const qrData = JSON.parse(data);
      if (!qrData.sessionId) {
        Toast.show({
          type: 'error',
          text1: 'Invalid QR Code',
          text2: 'This QR code does not contain a valid session ID.',
        });
        setScanned(false);
        return;
      }

      const res = await fetch("http://192.168.1.5:3000/api/auth/qr/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: qrData.sessionId }),
      });

      const json = await res.json();

      if (json.success) {
        await AsyncStorage.setItem('token', json.token);
        await AsyncStorage.setItem('userId', json.user.id);
        await AsyncStorage.setItem('userName', json.user.name);
        await AsyncStorage.setItem('userEmail', json.user.email);

        Toast.show({
          type: 'success',
          text1: 'Login Successful',
          text2: `Welcome, ${json.user.name}!`,
        });
        router.replace("/chat");
      } else {
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: json.error || "QR expired or invalid",
        });
        setScanned(false);
      }
    } catch (err) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: "Network error or invalid QR format",
      });
      setScanned(false);
    }
  }

  if (!permission) {
    return (
      <LinearGradient
        colors={['#0f172a', '#581c87', '#0f172a']}
        style={styles.container}
      >
        <Toast />
        <Text style={styles.message}>Requesting camera permission...</Text>
      </LinearGradient>
    );
  }

  if (!permission.granted) {
    return (
      <LinearGradient
        colors={['#0f172a', '#581c87', '#0f172a']}
        style={styles.container}
      >
        <Toast />
        <View style={styles.permissionContainer}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#a78bfa', '#3b82f6']}
              style={styles.iconGradient}
            >
              <Text style={styles.iconText}>📷</Text>
            </LinearGradient>
          </View>
          
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan the QR code from your web browser
          </Text>
          
          <TouchableOpacity onPress={requestPermission} style={styles.buttonWrapper}>
            <LinearGradient
              colors={['#a78bfa', '#3b82f6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.permissionButton}
            >
              <Text style={styles.buttonText}>Grant Permission</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.scannerContainer}>
      <Toast />
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : onScan}
      />
      
      {/* Top overlay with instructions */}
      <View style={styles.topOverlay}>
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.4)']}
          style={styles.topGradient}
        >
          <Text style={styles.instructionTitle}>Scan QR Code</Text>
          <Text style={styles.instructionText}>
            Point your camera at the QR code displayed on your web browser
          </Text>
        </LinearGradient>
      </View>

      {/* Scanning frame */}
      <View style={styles.scanFrame}>
        <View style={[styles.frameCorner, styles.topLeft]} />
        <View style={[styles.frameCorner, styles.topRight]} />
        <View style={[styles.frameCorner, styles.bottomLeft]} />
        <View style={[styles.frameCorner, styles.bottomRight]} />
      </View>

      {/* Processing indicator */}
      {scanned && (
        <View style={styles.bottomOverlay}>
          <View style={styles.processingContainer}>
            <LinearGradient
              colors={['#a78bfa', '#3b82f6']}
              style={styles.processingGradient}
            >
              <Text style={styles.processingText}>✓ Processing...</Text>
            </LinearGradient>
          </View>
        </View>
      )}

      {/* Back button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
          style={styles.backButtonGradient}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  message: {
    color: '#ffffff',
    fontSize: 16,
    padding: 16,
    textAlign: "center",
  },
  permissionContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconText: {
    fontSize: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#c4b5fd',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonWrapper: {
    width: '100%',
  },
  permissionButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  scannerContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topGradient: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  instructionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#c4b5fd',
    textAlign: 'center',
  },
  scanFrame: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 250,
    height: 250,
    marginLeft: -125,
    marginTop: -125,
  },
  frameCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#a78bfa',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  processingContainer: {
    width: '80%',
  },
  processingGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  processingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
  },
  backButtonGradient: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});