// Notification adapter for React Native
// Replaces antd message/notification with react-native-toast-message

import Toast from 'react-native-toast-message';

interface NotifyOptions {
  key?: string;
  message: string;
  description?: string;
  duration?: number;
}

export const notify = {
  success: (options: NotifyOptions) => {
    Toast.show({
      type: 'success',
      text1: options.message,
      text2: options.description,
      visibilityTime: (options.duration ?? 3) * 1000,
    });
  },

  error: (options: NotifyOptions) => {
    Toast.show({
      type: 'error',
      text1: options.message,
      text2: options.description,
      visibilityTime: (options.duration ?? 4) * 1000,
    });
  },

  warning: (options: NotifyOptions) => {
    Toast.show({
      type: 'info',
      text1: options.message,
      text2: options.description,
      visibilityTime: (options.duration ?? 3) * 1000,
    });
  },

  info: (options: NotifyOptions) => {
    Toast.show({
      type: 'info',
      text1: options.message,
      text2: options.description,
      visibilityTime: (options.duration ?? 3) * 1000,
    });
  },
};
