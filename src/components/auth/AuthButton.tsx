import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';

interface AuthButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  title,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <TouchableOpacity
      className={`w-full py-3.5 rounded-lg bg-[#4B6BFB] flex-row justify-center items-center ${
        disabled || loading ? 'opacity-50' : 'opacity-100'
      } ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text
          style={{
            color: '#fff',
            fontSize: 16,
            fontWeight: '500',
          }}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}; 