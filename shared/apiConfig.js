import * as Device from 'expo-device';
import { Platform } from 'react-native';

const LOCAL_BACKEND_URL = 'http://localhost:3000';

function normalizeBaseUrl(rawUrl) {
  return rawUrl.trim().replace(/\/+$/, '');
}

export function getBackendBaseUrl() {
  // For Expo web development, we proxy API calls through Metro so the browser
  // stays on the same origin and never hits CORS.
  if (__DEV__ && Platform.OS === 'web') {
    return '';
  }

  // When the app is running locally on your computer/simulator, use the local backend.
  // When it is running on a physical device, use the deployed backend.
  if (__DEV__ && !Device.isDevice) {
    return LOCAL_BACKEND_URL;
  }

  const remoteUrl = process.env.EXPO_PUBLIC_BACKEND_URL
    ? normalizeBaseUrl(process.env.EXPO_PUBLIC_BACKEND_URL)
    : null;

  if (!remoteUrl) {
    console.warn('EXPO_PUBLIC_BACKEND_URL is not set. Falling back to the local backend URL.');
    return LOCAL_BACKEND_URL;
  }

  return remoteUrl;
}

export function getApiUrl() {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) {
    return '/api';
  }
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
}
