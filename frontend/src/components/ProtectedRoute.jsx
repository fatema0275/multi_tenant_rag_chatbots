import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import SkeletonBlock from './ui/SkeletonBlock';

/**
 * ProtectedRoute
 * Redirects unauthenticated users to /login, preserving the intended destination.
 * Shows a skeleton loader briefly to avoid flash of redirect.
 */
const ProtectedRoute = ({ children }) => {
  const { token } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
