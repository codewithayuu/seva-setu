import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './components/ThemeProvider';
import { SkeletonCard } from './components/animations/SkeletonLoader';
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Feed = lazy(() => import('./pages/Feed'));
const Events = lazy(() => import('./pages/Events'));
const Donations = lazy(() => import('./pages/Donations'));
const DonationSuccess = lazy(() => import('./pages/DonationSuccess'));
const Profile = lazy(() => import('./pages/Profile'));
const CreateNGO = lazy(() => import('./pages/CreateNGO'));
const NGODetail = lazy(() => import('./pages/NGODetail'));
const NGODirectory = lazy(() => import('./pages/NGODirectory'));
const Messages = lazy(() => import('./pages/Messages'));
const Impact = lazy(() => import('./pages/Impact'));
const GamificationPage = lazy(() => import('./pages/GamificationPage'));
import { AuthProvider, useAuth } from './contexts/AuthContext';
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
export const API = `${BACKEND_URL}/api`;
axios.defaults.withCredentials = true;
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-2xl w-full px-4 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <PageLoader />;
  }
  return user ? children : <Navigate to="/" />;
}
function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={user ? <Navigate to="/feed" /> : <LandingPage />} />
          <Route path="/feed" element={<PrivateRoute><Feed /></PrivateRoute>} />
          <Route path="/events" element={<PrivateRoute><Events /></PrivateRoute>} />
          <Route path="/donations" element={<PrivateRoute><Donations /></PrivateRoute>} />
          <Route path="/donation-success" element={<PrivateRoute><DonationSuccess /></PrivateRoute>} />
          <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
          <Route path="/impact" element={<PrivateRoute><Impact /></PrivateRoute>} />
          <Route path="/impact-hub" element={<PrivateRoute><GamificationPage /></PrivateRoute>} />
          <Route path="/ngos" element={<PrivateRoute><NGODirectory /></PrivateRoute>} />
          <Route path="/profile/:userId" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/create-ngo" element={<PrivateRoute><CreateNGO /></PrivateRoute>} />
          <Route path="/ngo/:ngoId" element={<PrivateRoute><NGODetail /></PrivateRoute>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="App min-h-screen bg-background">
            <AppRoutes />
            <Toaster position="top-right" />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
export default App;