import React from 'react';
import { TextInput, TextInputProps, View, Text } from 'react-native';

interface AuthInputProps extends TextInputProps {
  label?: string;
  error?: boolean;
  errorMessage?: string;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  error,
  errorMessage,
  className = '',
  style,
  secureTextEntry,
  ...props
}) => {
  return (
    <View className="mb-4">
      <TextInput
        className={`w-full px-4 py-3 rounded-lg bg-gray-100 ${error ? 'border-2 border-red-300' : ''}`}
        placeholderTextColor="#999"
        style={[
          {
            fontSize: 16,
            fontWeight: '400',
          },
          style
        ]}
        autoComplete={secureTextEntry ? "password" : "email"}
        autoCorrect={false}
        spellCheck={false}
        textContentType={secureTextEntry ? "password" : "emailAddress"}
        autoCapitalize="none"
        secureTextEntry={secureTextEntry}
        {...props}
      />
      {error && errorMessage && (
        <Text 
          style={{ 
            fontSize: 13,
            color: '#ef4444',
            marginTop: 4,
            marginLeft: 4,
          }}
        >
          {errorMessage}
        </Text>
      )}
    </View>
  );
}; 