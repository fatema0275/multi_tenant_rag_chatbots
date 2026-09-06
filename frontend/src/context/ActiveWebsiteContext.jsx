import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchWebsites } from '../store/websiteSlice';

const ActiveWebsiteContext = createContext(null);

export const ActiveWebsiteProvider = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { websites, loading } = useSelector((s) => s.websites);

  const [activeWebsiteId, setActiveWebsiteIdState] = useState(() => {
    const saved = localStorage.getItem('sitemind_active_site_id');
    return saved ? Number(saved) : null;
  });

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchWebsites());
  }, [dispatch]);

  // Sync activeWebsiteId with loaded websites
  useEffect(() => {
    if (websites.length > 0) {
      const exists = websites.some((w) => w.id === activeWebsiteId);
      if (!exists) {
        const fallbackId = websites[0].id;
        setActiveWebsiteIdState(fallbackId);
        localStorage.setItem('sitemind_active_site_id', String(fallbackId));
      }
    } else {
      setActiveWebsiteIdState(null);
      localStorage.removeItem('sitemind_active_site_id');
    }
  }, [websites, activeWebsiteId]);

  const setActiveWebsiteId = useCallback((id) => {
    const numId = Number(id);
    setActiveWebsiteIdState(numId);
    localStorage.setItem('sitemind_active_site_id', String(numId));
  }, []);

  const activeWebsite = websites.find((w) => w.id === activeWebsiteId) || websites[0] || null;

  // Global keyboard shortcuts: W (switcher), D (dashboard)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore when user is typing in form controls
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setIsSwitcherOpen((prev) => !prev);
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        navigate('/dashboard');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <ActiveWebsiteContext.Provider
      value={{
        activeWebsite,
        activeWebsiteId,
        setActiveWebsiteId,
        websites,
        loading,
        isSwitcherOpen,
        setIsSwitcherOpen,
      }}
    >
      {children}
    </ActiveWebsiteContext.Provider>
  );
};

export const useActiveWebsite = () => {
  const context = useContext(ActiveWebsiteContext);
  if (!context) {
    throw new Error('useActiveWebsite must be used within an ActiveWebsiteProvider');
  }
  return context;
};

export default ActiveWebsiteContext;
