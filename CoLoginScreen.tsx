import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  useColorScheme,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Lexend_400Regular, Lexend_600SemiBold, Lexend_700Bold } from '@expo-google-fonts/lexend';
import { darkTheme } from './src/theme';

interface CoLoginScreenProps {
  onLogin: (apiKey: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export default function CoLoginScreen({ onLogin, isLoading, error }: CoLoginScreenProps) {
  const colorScheme = useColorScheme();
  const [apiKey, setApiKey] = useState('');

  const [fontsLoaded] = useFonts({
    Lexend_400Regular,
    Lexend_600SemiBold,
    Lexend_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const handleLogin = async () => {
    if (!apiKey.trim()) return;
    await onLogin(apiKey.trim());
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>co</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Letta API Key</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your Letta API key"
            placeholderTextColor={darkTheme.colors.text.tertiary}
            value={apiKey}
            onChangeText={setApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            editable={!isLoading}
            secureTextEntry
          />

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading || !apiKey.trim()}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Connect</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.helpText}>
            Don't have an API key? Visit letta.com to create one.
          </Text>

          <View style={styles.githubLink}>
            <Text style={styles.githubText}>
              co is{' '}
              <Text
                style={styles.githubLinkText}
                onPress={() => Linking.openURL('https://github.com/letta-ai/co')}
              >
                open source
              </Text>
              {' '}and welcomes contributions
            </Text>
          </View>
        </View>
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 48,
    fontFamily: 'Lexend_700Bold',
    color: darkTheme.colors.text.primary,
    letterSpacing: -1,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Lexend_600SemiBold',
    color: darkTheme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: darkTheme.colors.border.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
    backgroundColor: darkTheme.colors.background.secondary,
    color: darkTheme.colors.text.primary,
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    textAlign: 'center',
  },
  button: {
    height: 48,
    backgroundColor: darkTheme.colors.interactive.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Lexend_600SemiBold',
  },
  helpText: {
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    color: darkTheme.colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  githubLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  githubText: {
    fontSize: 13,
    fontFamily: 'Lexend_400Regular',
    color: darkTheme.colors.text.tertiary,
    textAlign: 'center',
  },
  githubLinkText: {
    color: darkTheme.colors.interactive.primary,
    textDecorationLine: 'underline',
  },
});
