import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { useActiveWebsite } from '../context/ActiveWebsiteContext';
import LogoutConfirmModal from '../components/ui/LogoutConfirmModal';
import WebsiteSwitcherModal from '../components/ui/WebsiteSwitcherModal';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  Globe,
  Bot,
  BarChart2,
  Settings as SettingsIcon,
  ChevronDown,
  LogOut,
  HelpCircle,
  Zap,
  Check,
  Plus,
} from 'lucide-react';

export const getSiteDisplayName = (site) => {
  if (!site) return '';
  if (site.name && site.name.trim()) return site.name.trim();
  if (site.display_name && site.display_name.trim()) return site.display_name.trim();
  const raw = site.domain || '';
  const cleaned = raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].trim();
  if (!cleaned) return 'Site';
  const parts = cleaned.split('.');
  if (parts.length >= 2) {
    const main = parts
      .slice(0, -1)
      .map((p) => p.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
      .join(' ');
    return main || cleaned;
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

export const getStatusDotColor = (w) => {
  const crawl = (w?.site?.crawl_status || w?.crawl_status || '').toLowerCase();
  const verify = (w?.verification_status || '').toLowerCase();
  if (crawl === 'failed' || crawl === 'error' || verify === 'failed') return 'bg-[#EF4444]';
  if (crawl === 'running' || crawl === 'crawling' || crawl === 'pending' || !crawl) return 'bg-[#EAB308] animate-pulse';
  if (crawl === 'completed' || crawl === 'ready' || verify === 'verified') return 'bg-[#22C55E]';
  return 'bg-[#22C55E]';
};

const getPageTitle = (pathname) => {
  if (pathname === '/dashboard' || pathname === '/dashboard/') return 'Home';
  if (pathname.startsWith('/dashboard/websites')) return 'My Websites';
  if (pathname.startsWith('/dashboard/chatbot')) return 'Chatbot Studio';
  if (pathname.startsWith('/dashboard/analytics')) return 'Analytics';
  if (pathname.startsWith('/dashboard/settings')) return 'Settings';
  if (pathname.startsWith('/admin')) return 'Admin Dashboard';
  return 'Dashboard';
};

const DashboardLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((s) => s.auth);

  const {
    activeWebsite,
    activeWebsiteId,
    setActiveWebsiteId,
    websites,
    isSwitcherOpen,
    setIsSwitcherOpen,
  } = useActiveWebsite();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close top dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const navItems = [
    { label: 'Home', path: '/dashboard', icon: LayoutDashboard, exact: true },
    { label: 'My Websites', path: '/dashboard/websites', icon: Globe },
    { label: 'Chatbot Studio', path: '/dashboard/chatbot', icon: Bot },
    { label: 'Analytics', path: '/dashboard/analytics', icon: BarChart2 },
    { label: 'Settings', path: '/dashboard/settings', icon: SettingsIcon },
  ];

  const pageTitle = getPageTitle(location.pathname);
  const activeDisplayName = activeWebsite ? getSiteDisplayName(activeWebsite) : null;
  const activeDot = activeWebsite ? getStatusDotColor(activeWebsite) : '';

  const userInitial = (user?.name || user?.email || 'U')[0].toUpperCase();
  const userEmail = user?.email || 'user@example.com';

  return (
    <div className="h-screen bg-[#09090B] text-white flex flex-col font-sans antialiased overflow-hidden">
      {/* ── Persistent Top Navbar (visible across all pages and mobile) ── */}
      <header className="h-14 shrink-0 border-b border-[#27272A] bg-[#131318] px-4 sm:px-6 flex items-center justify-between z-40">
        {/* Left side: Current page title in Plus Jakarta Sans 600 */}
        <div className="flex items-center gap-3">
          <h1 className="font-heading font-semibold text-base sm:text-lg text-white tracking-tight">
            {pageTitle}
          </h1>
        </div>

        {/* Right side: Active website context pill with site switcher dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            id="active-website-context-pill"
            title="Click to switch website context"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#131318] border border-[#27272A] hover:border-[#22C55E]/40 hover:bg-[#27272A]/40 transition-all cursor-pointer shadow-sm group"
          >
            {activeWebsite ? (
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${activeDot}`} />
                <span className="font-heading text-xs font-semibold text-white group-hover:text-[#22C55E] transition-colors max-w-[140px] sm:max-w-[200px] truncate">
                  {activeDisplayName}
                </span>
              </span>
            ) : (
              <span className="text-xs text-zinc-400 font-heading font-medium">Select a website</span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 transition-transform ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Site Switcher Dropdown */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-[14px] bg-[#131318] border border-[#27272A] shadow-2xl z-50 p-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-2 border-b border-[#27272A]/80 flex items-center justify-between">
                <span className="text-xs uppercase font-semibold tracking-wider text-zinc-400 font-heading">
                  Active Website Context
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  {websites.length} total
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto py-1 space-y-0.5">
                {websites.length === 0 ? (
                  <div className="px-3 py-3 text-center text-xs text-zinc-400">
                    No websites added yet
                  </div>
                ) : (
                  websites.map((w) => {
                    const isSelected = w.id === activeWebsiteId;
                    const siteName = getSiteDisplayName(w);
                    const dot = getStatusDotColor(w);
                    return (
                      <button
                        key={w.id}
                        onClick={() => {
                          setActiveWebsiteId(w.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-[8px] text-left text-xs font-heading transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#22C55E]/15 text-[#22C55E] font-semibold'
                            : 'text-zinc-300 hover:text-white hover:bg-[#27272A]/50'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate flex-1 pr-1">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                          <span className="truncate">{siteName}</span>
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="pt-1 border-t border-[#27272A]/80">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate('/dashboard/websites');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-xs font-heading font-medium text-[#22C55E] hover:bg-[#22C55E]/10 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Website</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── App Shell Body: Sidebar + Main Workspace ─ */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Sidebar (Desktop: md:flex) */}
        <aside className="w-60 lg:w-64 shrink-0 border-r border-[#27272A] bg-[#131318] flex-col overflow-y-auto hidden md:flex">
          {/* Top of Sidebar: Logo Mark + Product Name SiteMind */}
          <div className="px-5 pt-5 pb-3">
            <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-[10px] bg-[#22C55E] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Zap className="w-4.5 h-4.5 text-[#09090B]" strokeWidth={2.5} />
              </div>
              <span className="font-heading font-bold text-lg tracking-tight text-white">
                Site<span className="text-[#22C55E]">Mind</span>
              </span>
            </NavLink>

            {/* Below Logo: User Email + Avatar Initial Circle */}
            <div className="mt-4 flex items-center gap-2.5 px-1 py-1 text-zinc-400">
              <div className="w-6 h-6 rounded-full bg-[#22C55E]/20 border border-[#22C55E]/30 flex items-center justify-center text-[11px] font-bold text-[#22C55E] shrink-0">
                {userInitial}
              </div>
              <span className="text-xs text-zinc-400 truncate max-w-[160px]" title={userEmail}>
                {userEmail}
              </span>
            </div>
          </div>

          {/* Top-level Nav Items (No section label) */}
          <nav className="mt-3 space-y-1" role="navigation" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isMatch = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-heading font-medium transition-all ${
                    isMatch
                      ? 'border-l-[3px] border-[#22C55E] text-white bg-[#1C1C24]'
                      : 'border-l-[3px] border-transparent text-zinc-400 hover:text-white hover:bg-[#1C1C24]/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isMatch ? 'text-white' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* YOUR SITES section (if user has at least one registered website) */}
          {websites && websites.length > 0 && (
            <div className="mt-6 px-3">
              <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 font-heading">
                YOUR SITES
              </div>
              <div className="space-y-0.5">
                {websites.slice(0, 5).map((w) => {
                  const isContextActive = w.id === activeWebsiteId;
                  const dotColor = getStatusDotColor(w);
                  const displayName = getSiteDisplayName(w);
                  return (
                    <button
                      key={w.id}
                      onClick={() => {
                        setActiveWebsiteId(w.id);
                        navigate('/dashboard/chatbot');
                      }}
                      title={`Switch to ${displayName} and go to Chatbot Studio`}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-r-lg text-xs font-heading text-left transition-all cursor-pointer ${
                        isContextActive
                          ? 'text-white bg-[#1C1C24] font-medium'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1C1C24]/60'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                      <span className="truncate flex-1">{displayName}</span>
                    </button>
                  );
                })}
                {websites.length > 5 && (
                  <NavLink
                    to="/dashboard/websites"
                    className="inline-block px-3 py-1.5 text-xs text-[#22C55E] hover:underline font-heading font-medium"
                  >
                    View all ({websites.length})
                  </NavLink>
                )}
              </div>
            </div>
          )}

          {/* Bottom of Sidebar: Help link and Logout button */}
          <div className="mt-auto p-3 border-t border-[#27272A] space-y-1">
            <button
              onClick={() => {
                toast('Need help? Visit our docs or reach out to support.', {
                  icon: 'ℹ️',
                  style: { background: '#131318', color: '#fff', border: '1px solid #27272A' },
                });
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-heading font-medium text-zinc-400 hover:text-zinc-200 hover:bg-[#1C1C24] rounded-lg transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Help</span>
            </button>
            <button
              onClick={() => setShowLogoutModal(true)}
              id="sidebar-logout-btn"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-heading font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Center Workspace (pb-16 on mobile to account for fixed bottom tab bar) */}
        <main className="flex-1 flex flex-col min-w-0 h-full bg-[#09090B] overflow-hidden pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile Bottom Tab Bar (< 768px: md:hidden) ───────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#131318] border-t border-[#27272A] z-50 flex items-center justify-around px-2"
        role="navigation"
        aria-label="Mobile Navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isMatch = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              aria-label={item.label}
              className={`p-3 rounded-xl transition-colors ${
                isMatch ? 'text-[#22C55E]' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className="w-6 h-6" />
            </NavLink>
          );
        })}
      </nav>

      {/* Website Switcher Modal */}
      <WebsiteSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        onOpenAddSite={() => navigate('/dashboard/websites')}
      />

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          dispatch(logout());
          toast.success('Logged out successfully');
        }}
      />
    </div>
  );
};

export default DashboardLayout;
