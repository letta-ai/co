import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../theme';
import useAppStore from '../store/appStore';
import { showAlert, showConfirmAlert } from '../utils/prompts';

const SettingsScreen: React.FC = () => {
  const {
    apiToken,
    isAuthenticated,
    isLoading,
    error,
    setApiToken,
    clearApiToken,
    reset,
  } = useAppStore();

  const [tokenInput, setTokenInput] = useState(apiToken || '');
  const [showToken, setShowToken] = useState(false);

  const handleSaveToken = async () => {
    const trimmedToken = tokenInput.trim();
    
    if (!trimmedToken) {
      showAlert('Error', 'Please enter a valid API token');
      return;
    }

    try {
      await setApiToken(trimmedToken);
    } catch (error) {
      // Error is already handled in the store
    }
  };

  const handleClearToken = () => {
    showConfirmAlert(
      'Clear API Token',
      'This will log you out and clear all data. Are you sure?',
      () => {
        clearApiToken();
        setTokenInput('');
      },
      undefined,
      'Clear'
    );
  };

  const handleResetApp = () => {
    showConfirmAlert(
      'Reset App',
      'This will clear all data and log you out. Are you sure?',
      () => {
        reset();
        setTokenInput('');
      },
      undefined,
      'Reset'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>
              Configure your Letta API connection
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>API Configuration</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>API Token</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.tokenInput}
                  value={tokenInput}
                  onChangeText={setTokenInput}
                  placeholder="Enter your Letta API token"
                  placeholderTextColor={darkTheme.colors.text.secondary}
                  secureTextEntry={!showToken}
                  editable={!isLoading}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowToken(!showToken)}
                >
                  <Ionicons
                    name={showToken ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={darkTheme.colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>
              
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {isAuthenticated && (
                <View style={styles.successContainer}>
                  <Ionicons name="checkmark-circle" size={16} color={darkTheme.colors.status.success} />
                  <Text style={styles.successText}>Connected successfully</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isLoading && styles.saveButtonDisabled,
                ]}
                onPress={handleSaveToken}
                disabled={isLoading}
              >
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Connecting...' : 'Save & Connect'}
                </Text>
              </TouchableOpacity>
            </View>

            {isAuthenticated && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearToken}
              >
                <Text style={styles.clearButtonText}>Clear Token</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            
            <View style={styles.infoContainer}>
              <Text style={styles.infoTitle}>Letta Chat App</Text>
              <Text style={styles.infoText}>
                Connect to your Letta agents and have conversations with AI assistants.
              </Text>
              
              <Text style={styles.infoSubtitle}>Getting Started:</Text>
              <Text style={styles.infoText}>
                1. Get your API token from the Letta dashboard{'\n'}
                2. Enter it above and tap "Save & Connect"{'\n'}
                3. Create or select an agent from the drawer{'\n'}
                4. Start chatting!
              </Text>
              
              <Text style={styles.infoSubtitle}>Documentation:</Text>
              <Text style={styles.linkText}>docs.letta.com</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data & Privacy</Text>
            
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleResetApp}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              <Text style={styles.dangerButtonText}>Reset App Data</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: darkTheme.colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: darkTheme.colors.text.secondary,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: darkTheme.colors.text.primary,
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  inputContainer: {
    paddingHorizontal: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: darkTheme.colors.text.primary,
    marginBottom: 8,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.background.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkTheme.colors.border.primary,
  },
  tokenInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    color: darkTheme.colors.text.primary,
  },
  eyeButton: {
    padding: 12,
  },
  errorContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: darkTheme.colors.status.error + '20',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: darkTheme.colors.status.error,
  },
  errorText: {
    fontSize: 14,
    color: darkTheme.colors.status.error,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 12,
    backgroundColor: darkTheme.colors.status.success + '20',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: darkTheme.colors.status.success,
  },
  successText: {
    fontSize: 14,
    color: darkTheme.colors.status.success,
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: darkTheme.colors.interactive.primary,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.colors.text.inverse,
  },
  clearButton: {
    marginTop: 12,
    marginHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    color: darkTheme.colors.status.error,
    fontWeight: '500',
  },
  infoContainer: {
    paddingHorizontal: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: darkTheme.colors.text.primary,
    marginBottom: 8,
  },
  infoSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: darkTheme.colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: darkTheme.colors.text.secondary,
    lineHeight: 20,
  },
  linkText: {
    fontSize: 14,
    color: darkTheme.colors.interactive.primary,
    textDecorationLine: 'underline',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: darkTheme.colors.status.error,
    borderRadius: 12,
  },
  dangerButtonText: {
    fontSize: 16,
    color: darkTheme.colors.status.error,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default SettingsScreen;
