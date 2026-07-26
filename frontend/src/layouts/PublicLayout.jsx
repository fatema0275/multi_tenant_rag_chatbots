/**
 * PublicLayout.jsx
 * Wrapper layout for public-facing pages (Landing, Login, Signup, ForgotPassword).
 * Provides the page-level background and ensures the Toaster is accessible.
 * Auth pages and the landing page both use a dark background — light mode
 * only applies to the protected dashboard.
 */
import React from 'react';

/**
 * @param {{ children: React.ReactNode }} props
 */
const PublicLayout = ({ children }) => (
  <div className="min-h-screen bg-page-dark text-txt-primary-dark antialiased">
    {children}
  </div>
);

export default PublicLayout;
