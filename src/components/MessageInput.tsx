import React, { useState, useEffect } from 'react';
import { TextInput, StyleSheet, Platform } from 'react-native';

interface MessageInputProps {
  onTextChange: (text: string) => void;
  onSendMessage: () => void;
  isSendingMessage: boolean;
  colorScheme: 'light' | 'dark';
  onFocusChange: (focused: boolean) => void;
  clearTrigger: number;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onTextChange,
  onSendMessage,
  isSendingMessage,
  colorScheme,
  onFocusChange,
  clearTrigger,
}) => {
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    if (clearTrigger > 0) {
      setInputText('');
    }
  }, [clearTrigger]);

  const handleTextChange = React.useCallback((text: string) => {
    setInputText(text);
    onTextChange(text);
  }, [onTextChange]);

  const handleSubmit = React.useCallback(() => {
    if (inputText.trim() && !isSendingMessage) {
      onSendMessage();
    }
  }, [inputText, isSendingMessage, onSendMessage]);

  const inputStyle = React.useMemo(() => [
    styles.textInput,
    {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      backgroundColor: colorScheme === 'dark' ? '#242424' : '#FFFFFF',
      fontFamily: 'Lexend_400Regular',
    }
  ], [colorScheme]);

  const handleFocus = React.useCallback(() => onFocusChange(true), [onFocusChange]);
  const handleBlur = React.useCallback(() => onFocusChange(false), [onFocusChange]);

  return (
    <TextInput
      style={inputStyle}
      placeholder="What's on your mind?"
      placeholderTextColor={colorScheme === 'dark' ? '#666666' : '#999999'}
      value={inputText}
      onChangeText={handleTextChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      multiline
      maxLength={4000}
      editable={!isSendingMessage}
      autoFocus
      onSubmitEditing={handleSubmit}
    />
  );
};

const styles = StyleSheet.create({
  textInput: {
    width: '100%',
    height: 48,
    paddingLeft: 18,
    paddingRight: 130,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 24,
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 0,
    ...(Platform.OS === 'web' && {
      // @ts-ignore
      outline: 'none',
      WebkitAppearance: 'none',
      MozAppearance: 'none',
    }),
  },
});

export default React.memo(MessageInput);
