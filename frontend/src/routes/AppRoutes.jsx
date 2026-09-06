/**
 * AppRoutes.jsx
 * Central route configuration for the SiteMind frontend.
 * All page-level routes are declared here so App.jsx stays lean.
 */
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import SkeletonBlock from '../components/ui/SkeletonBlock';
import { ActiveWebsiteProvider } from '../context/ActiveWebsiteContext';

// Lazy-load page components to enable route-based code splitting.
const Landing         = lazy(() => import('../pages/Landing'));
const Login           = lazy(() => import('../pages/Login'));
const Signup          = lazy(() => import('../pages/Signup'));
const ForgotPassword  = lazy(() => import('../pages/ForgotPassword'));
const DashboardLayout = lazy(() => import('../layouts/DashboardLayout'));
const Dashboard       = lazy(() => import('../pages/Dashboard'));
const MyWebsites      = lazy(() => import('../pages/MyWebsites'));
const ChatbotStudio   = lazy(() => import('../pages/ChatbotStudio'));
const Analytics       = lazy(() => import('../pages/Analytics'));
const Settings        = lazy(() => import('../pages/Settings'));
const AdminDashboard  = lazy(() => import('../pages/AdminDashboard'));

/** Full-screen fallback while a lazy chunk loads. */
const PageLoader = () => (
  <div className="min-h-screen bg-[#09090B] flex flex-col gap-4 p-8">
    <SkeletonBlock className="h-12 w-48 rounded-xl" />
    <SkeletonBlock className="h-64 w-full rounded-2xl" />
    <SkeletonBlock className="h-32 w-full rounded-2xl" />
  </div>
);

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Public */}
      <Route path="/"                element={<Landing />} />
      <Route path="/login"           element={<Login />} />
      <Route path="/signup"          element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Protected User Dashboard Layout & Nested Sections */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <ActiveWebsiteProvider>
              <DashboardLayout />
            </ActiveWebsiteProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="websites" element={<MyWebsites />} />
        <Route path="chatbot" element={<ChatbotStudio />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Protected Admin Dashboard */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
