import React, { useState } from 'react';
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
  BarChart3,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronRight,
  LogOut,
  Zap,
  Check,
  Plus,
} from 'lucide-react';

const getStatusColor = (w) => {
  const crawl = w?.site?.crawl_status || w?.crawl_status || 'pending';
  if (crawl === 'completed' || w?.verification_status === 'verified') return 'bg-[#22C55E]';
  if (crawl === 'running' || crawl === 'crawling' || crawl === 'pending') return 'bg-amber-400 animate-pulse';
  if (crawl === 'failed' || crawl === 'cancelled') return 'bg-red-400';
  return 'bg-[#22C55E]';
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
  // Auto-expand My Websites if user is on /dashboard/websites or if there are sites
  const [websitesExpanded, setWebsitesExpanded] = useState(true);

  const isWebsitesRoute = location.pathname === '/dashboard/websites';

  const handleSelectSiteContext = (siteId) => {
    setActiveWebsiteId(siteId);
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, exact: true },
    { label: 'My Websites', path: '/dashboard/websites', icon: Globe, hasChildren: true },
    { label: 'Chatbot Studio', path: '/dashboard/chatbot', icon: Bot },
    { label: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
    { label: 'Settings', path: '/dashboard/settings', icon: SettingsIcon },
  ];

  return (
    <div className="h-screen bg-[#09090B] text-white flex flex-col font-sans antialiased overflow-hidden">
      {/* ── Top Navbar ────────────────────────────────────────── */}
      <header className="h-14 shrink-0 border-b border-[#27272A] bg-[#131318] px-4 sm:px-6 flex items-center justify-between z-40">
        {/* Left: SiteMind Logo */}
        <div className="flex items-center gap-3">
          <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-[12px] bg-[#22C55E] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 text-[#09090B]" strokeWidth={2.5} />
            </div>
            <span className="font-heading font-bold text-base tracking-tight text-white">
              Site<span className="text-[#22C55E]">Mind</span>
            </span>
          </NavLink>
        </div>

        {/* Center: Active Website Context Pill */}
        <div className="flex items-center">
          <button
            onClick={() => setIsSwitcherOpen(true)}
            id="active-website-context-pill"
            title="Click to switch website context or press W"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#131318] border border-[#27272A] hover:border-[#22C55E]/40 hover:bg-[#27272A]/30 transition-all cursor-pointer shadow-sm group"
          >
            <span className="text-[10.5px] uppercase tracking-wider text-zinc-400 font-medium hidden sm:inline">
              Site Context:
            </span>
            {activeWebsite ? (
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(activeWebsite)}`} />
                <span className="text-xs font-semibold text-white group-hover:text-[#22C55E] transition-colors max-w-[150px] sm:max-w-[200px] truncate font-mono">
                  {activeWebsite.domain}
                </span>
              </span>
            ) : (
              <span className="text-xs text-zinc-400">Select Website</span>
            )}
            <kbd className="hidden md:inline-flex text-[9px] font-mono text-zinc-400 bg-[#27272A] px-1.5 py-0.5 rounded border border-zinc-700/50">
              W
            </kbd>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 transition-transform" />
          </button>
        </div>

        {/* Right: User Avatar & Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5 pl-2">
            <div className="w-7 h-7 rounded-full bg-[#22C55E]/20 border border-[#22C55E]/30 flex items-center justify-center text-xs font-bold text-[#22C55E]">
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-xs font-medium text-zinc-200 leading-tight max-w-[120px] truncate">
                {user?.name || user?.email?.split('@')[0] || 'Account'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowLogoutModal(true)}
            id="navbar-logout-btn"
            title="Log Out"
            className="p-2 rounded-[10px] text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── App Shell Body: Two-Level Sidebar + Main Workspace ─ */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Two-Level Sidebar */}
        <aside className="w-56 lg:w-60 shrink-0 border-r border-[#27272A] bg-[#131318] flex flex-col overflow-y-auto hidden md:flex">
          <div className="p-3.5 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isMatch = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              if (item.hasChildren) {
                return (
                  <div key={item.path} className="space-y-1">
                    <div
                      className={`flex items-center justify-between px-3 py-2.5 rounded-[12px] text-xs font-semibold transition-all cursor-pointer ${
                        isMatch
                          ? 'bg-[#22C55E]/10 text-[#22C55E]'
                          : 'text-zinc-400 hover:text-white hover:bg-[#27272A]/40'
                      }`}
                    >
                      <NavLink
                        to={item.path}
                        className="flex items-center gap-2.5 flex-1"
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </NavLink>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setWebsitesExpanded(!websitesExpanded);
                        }}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
                        title={websitesExpanded ? 'Collapse websites' : 'Expand websites'}
                      >
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${
                            websitesExpanded ? 'rotate-0' : '-rotate-90'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Second Level: Registered Websites */}
                    {websitesExpanded && (
                      <div className="pl-6 pr-2 py-1 space-y-0.5 border-l border-[#27272A] ml-4">
                        {websites.length === 0 ? (
                          <div className="px-2 py-2 text-[11px] text-zinc-400">
                            No websites yet
                          </div>
                        ) : (
                          websites.map((w) => {
                            const isContextActive = w.id === activeWebsiteId;
                            const dotColor = getStatusColor(w);
                            return (
                              <button
                                key={w.id}
                                onClick={() => handleSelectSiteContext(w.id)}
                                title={`Set ${w.domain} as active context`}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[8px] text-[11px] font-mono text-left transition-all cursor-pointer ${
                                  isContextActive
                                    ? 'bg-[#22C55E]/15 text-[#22C55E] font-medium'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#27272A]/30'
                                }`}
                              >
                                <span className="flex items-center gap-2 truncate flex-1 pr-1">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                                  <span className="truncate">{w.domain}</span>
                                </span>
                                {isContextActive && (
                                  <Check className="w-3 h-3 text-[#22C55E] shrink-0" />
                                )}
                              </button>
                            );
                          })
                        )}
                        <NavLink
                          to="/dashboard/websites"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-[#22C55E] hover:underline font-sans"
                        >
                          <Plus className="w-3 h-3" /> Add Website
                        </NavLink>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] text-xs font-semibold transition-all ${
                    isMatch
                      ? 'bg-[#22C55E]/10 text-[#22C55E]'
                      : 'text-zinc-400 hover:text-white hover:bg-[#27272A]/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Bottom Sidebar Info */}
          <div className="mt-auto p-4 border-t border-[#27272A] bg-[#09090B]/40">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>Active Context</span>
              <span className="text-[#22C55E] font-mono text-[10px]">
                {activeWebsite ? `tenant_${activeWebsite.id}` : 'none'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-1 font-mono truncate">
              {activeWebsite?.domain || 'Select a site'}
            </p>
          </div>
        </aside>

        {/* Center Workspace */}
        <main className="flex-1 flex flex-col min-w-0 h-full bg-[#09090B] overflow-hidden">
          <Outlet />
        </main>
      </div>

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
