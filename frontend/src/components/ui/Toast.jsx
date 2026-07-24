import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useSelector } from 'react-redux';

/**
 * Toast — wraps react-hot-toast's Toaster with SiteMind's dark/light palette.
 * Mount this once at the app root.
 */
const Toast = () => {
  const mode = useSelector((state) => state.theme.mode);
  const dark = mode === 'dark';

  return (
    <Toaster
      position="top-right"
      gutter={8}
      toastOptions={{
        duration: 4000,
        style: {
          background: dark ? '#131318' : '#FFFFFF',
          color: dark ? '#FAFAFA' : '#18181B',
          border: `1px solid ${dark ? '#27272A' : '#E4E4E7'}`,
          borderRadius: '14px',
          fontSize: '14px',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '12px 16px',
          boxShadow: dark
            ? '0 4px 24px -4px rgba(0,0,0,0.5)'
            : '0 4px 24px -4px rgba(0,0,0,0.12)',
        },
        success: {
          iconTheme: { primary: '#22C55E', secondary: dark ? '#131318' : '#fff' },
        },
        error: {
          iconTheme: { primary: '#EF4444', secondary: dark ? '#131318' : '#fff' },
        },
      }}
    />
  );
};

export default Toast;
