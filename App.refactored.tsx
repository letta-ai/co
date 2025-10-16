import React, { useState, useEffect } from 'react';
import { useColorScheme, ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import { useFonts, Lexend_300Light, Lexend_400Regular, Lexend_500Medium, Lexend_600SemiBold, Lexend_700Bold } from '@expo-google-fonts/lexend';
import { StatusBar } from 'expo-status-bar';

// Components
import { ErrorBoundary } from './src/components/ErrorBoundary';
import LogoLoader from './src/components/LogoLoader';
import CoLoginScreen from './CoLoginScreen';
import { ChatScreen } from './src/screens/ChatScreen';

// Hooks
import { useAuth } from './src/hooks/useAuth';
import { useAgent } from './src/hooks/useAgent';

// Theme
import { darkTheme, lightTheme } from './src/theme';

function CoApp() {
  const systemColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(systemColorScheme || 'dark');

  // Load fonts
  const [fontsLoaded] = useFonts({
    Lexend_300Light,
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
    Lexend_700Bold,
  });

  // Set Android system UI colors
  useEffect(() => {
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync(darkTheme.colors.background.primary);
    }
  }, []);

  // Use hooks for state management
  const {
    isConnected,
    isLoadingToken,
    isConnecting,
    connectionError,
    connectWithToken,
  } = useAuth();

  const { coAgent, isInitializingCo } = useAgent();

  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  // Show loading screen while fonts load or token is being loaded
  if (!fontsLoaded || isLoadingToken) {
    return <LogoLoader />;
  }

  // Show login screen if not connected
  if (!isConnected) {
    return (
      <CoLoginScreen
        onLogin={connectWithToken}
        isConnecting={isConnecting}
        error={connectionError || undefined}
      />
    );
  }

  // Show loading while Co agent initializes
  if (isInitializingCo || !coAgent) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background.primary }]}>
        <LogoLoader />
      </View>
    );
  }

  // Main app
  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ChatScreen theme={theme} />
    </>
  );
}

// Wrap app with providers and error boundary
export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <CoApp />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
