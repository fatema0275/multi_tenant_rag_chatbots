/**
 * DashboardLayout.jsx
 * Layout shell for protected/authenticated pages.
 * Supports both light and dark mode via Tailwind `dark:` variants.
 * The actual header/nav for the dashboard is rendered inside Dashboard.jsx
 * itself (sticky positioning requires it to be a sibling of the scroll root).
 */
import React from 'react';

/**
 * @param {{ children: React.ReactNode }} props
 */
const DashboardLayout = ({ children }) => (
  <div className="min-h-screen bg-page-light dark:bg-page-dark text-txt-primary-light dark:text-txt-primary-dark transition-colors duration-200 antialiased">
    {children}
  </div>
);

export default DashboardLayout;
