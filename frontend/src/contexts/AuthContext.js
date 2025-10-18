import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
const AuthContext = createContext();
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('session_id=')) {
      const sessionId = hash.split('session_id=')[1].split('&')[0];
      processGoogleSession(sessionId);
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      checkAuth();
    }
  }, []);
  const processGoogleSession = async (sessionId) => {
    try {
      const response = await axios.post(`${API}/auth/session`, { session_id: sessionId });
      setUser(response.data.user);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };
  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  const register = async (name, email, password, userType) => {
    const response = await axios.post(`${API}/auth/register`, {
      name,
      email,
      password,
      user_type: userType
    });
    setUser(response.data.user);
    localStorage.setItem('token', response.data.token);
    return response.data;
  };
  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    setUser(response.data.user);
    localStorage.setItem('token', response.data.token);
    return response.data;
  };
  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`);
    } catch (error) {
    } finally {
      setUser(null);
      localStorage.removeItem('token');
    }
  };
  const loginWithGoogle = () => {
    const redirectUrl = `${window.location.origin}/feed`;
    window.location.href = `https://auth.example.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, loginWithGoogle, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
