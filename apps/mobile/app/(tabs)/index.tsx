import { Image } from "expo-image";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/themed-text";

export default function HomeScreen() {
  return (
    <LinearGradient
      colors={['#0f172a', '#581c87', '#0f172a']}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo/Icon */}
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={['#a78bfa', '#3b82f6']}
            style={styles.logoGradient}
          >
            <ThemedText style={styles.logoText}>⚡</ThemedText>
          </LinearGradient>
        </View>

        {/* Title */}
        <ThemedText style={styles.title}>Welcome</ThemedText>
        <ThemedText style={styles.subtitle}>
          Secure encrypted messaging
        </ThemedText>

        {/* QR Login Button */}
        <Link href="/qr-login" asChild>
          <TouchableOpacity style={styles.buttonWrapper}>
            <LinearGradient
              colors={['#a78bfa', '#3b82f6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <ThemedText style={styles.buttonText}>
                🔐 Login via QR Code
              </ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        </Link>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureCard}>
            <ThemedText style={styles.featureIcon}>🔒</ThemedText>
            <ThemedText style={styles.featureTitle}>End-to-End Encrypted</ThemedText>
            <ThemedText style={styles.featureText}>
              Your messages are secure and private
            </ThemedText>
          </View>

          <View style={styles.featureCard}>
            <ThemedText style={styles.featureIcon}>⚡</ThemedText>
            <ThemedText style={styles.featureTitle}>Real-time Messaging</ThemedText>
            <ThemedText style={styles.featureText}>
              Instant delivery and synchronization
            </ThemedText>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoGradient: {
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
  logoText: {
    fontSize: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#c4b5fd',
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonWrapper: {
    width: '100%',
    marginBottom: 40,
  },
  primaryButton: {
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
  featuresContainer: {
    width: '100%',
    gap: 16,
  },
  featureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#c4b5fd',
    textAlign: 'center',
  },
});