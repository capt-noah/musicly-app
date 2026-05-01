import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { getApiUrl, getBackendBaseUrl } from '../shared/apiConfig';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const API_URL = getApiUrl();
  const BASE_URL = getBackendBaseUrl();

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      const storedSessionId = await AsyncStorage.getItem('sessionId');

      if (storedUser && storedSessionId) {
        setUser(JSON.parse(storedUser));
        setSessionId(storedSessionId);
        setIsAuthenticated(true);
        // Refresh user data from backend in background
        validateSession(storedSessionId);
      }
    } catch (e) {
      console.error('Failed to load session', e);
    } finally {
      setIsLoading(false);
    }
  };

  const validateSession = async (sid) => {
    try {
      const response = await fetch(`${API_URL}/me`, {
        headers: { 'Authorization': `Bearer ${sid}` }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
      } else if (response.status === 401 || response.status === 403) {
        // Session expired
        logout();
      } else {
        console.warn(`Server returned ${response.status} during session validation. Staying logged in.`);
      }
    } catch (e) {
      console.warn('Could not validate session (offline?)');
    }
  };

  const login = async (username, password) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('sessionId', data.sessionId);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        setSessionId(data.sessionId);
        setUser(data.user);
        setIsAuthenticated(true);
        router.replace('/tabs/Home');
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (e) {
      return { success: false, error: 'Network error. Is the server running?' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('sessionId', data.sessionId);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        setSessionId(data.sessionId);
        setUser(data.user);
        setIsAuthenticated(true);
        router.replace('/tabs/Home');
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (e) {
      return { success: false, error: 'Network error. Is the server running?' };
    }
  };

  const logout = async () => {
    if (sessionId) {
      fetch(`${API_URL}/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionId}` }
      }).catch(() => {});
    }
    try {
      await AsyncStorage.removeItem('sessionId');
      await AsyncStorage.removeItem('user');
      setSessionId(null);
      setUser(null);
      setIsAuthenticated(false);
      router.replace('/');
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      sessionId,
      isAuthenticated, 
      isLoading, 
      login, 
      register, 
      logout,
      refreshUser: validateSession,
      API_URL,
      BASE_URL,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
