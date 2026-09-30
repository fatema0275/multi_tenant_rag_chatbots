import React from 'react';
import {
  LayoutDashboard,
  Globe,
  MessageSquare,
  Users,
  Activity,
  BookOpen,
  Zap,
  LogOut,
  UserCheck,
  ChevronRight,
  ShieldAlert,
  Server
} from 'lucide-react';
import ThemeToggle from '../ThemeToggle';

export const ADMIN_PAGES = {
  // Analytics Section
  OVERVIEW: 'overview',
  WEBSITE_HEALTH: 'website-health',
  QUERY_INTELLIGENCE: 'query-intelligence',
  USER_ACTIVITY: 'user-activity',
  SYSTEM_PERFORMANCE: 'system-performance',
  CONTENT_QUALITY: 'content-quality',

  // Management Section (Existing)
  MANAGE_USERS: 'manage-users',
  MANAGE_WEBSITES: 'manage-websites',
};

const AdminSidebar = ({
  activePage,
  setActivePage,
  user,
  onLogout,
  isMobileOpen,
  setIsMobileOpen
}) => {
  const managementNav = [
    { id: ADMIN_PAGES.MANAGE_USERS, label: 'User Management', icon: Users, badge: null },
    { id: ADMIN_PAGES.MANAGE_WEBSITES, label: 'Website Management', icon: Globe, badge: null },
  ];

  const analyticsNav = [
    { id: ADMIN_PAGES.OVERVIEW, label: 'Platform Overview', icon: LayoutDashboard },
    { id: ADMIN_PAGES.WEBSITE_HEALTH, label: 'Website Health', icon: Globe },
    { id: ADMIN_PAGES.QUERY_INTELLIGENCE, label: 'Query Intelligence', icon: MessageSquare },
    { id: ADMIN_PAGES.USER_ACTIVITY, label: 'User Activity', icon: Users },
    { id: ADMIN_PAGES.SYSTEM_PERFORMANCE, label: 'System Performance', icon: Activity },
    { id: ADMIN_PAGES.CONTENT_QUALITY, label: 'Content Quality', icon: BookOpen },
  ];

  const handleSelect = (pageId) => {
    setActivePage(pageId);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-[#111115] border-r border-zinc-200 dark:border-border-dark flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 px-5 border-b border-zinc-200 dark:border-border-dark flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shadow-md shadow-accent/20">
              <Zap className="w-4 h-4 text-[#09090B]" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-base tracking-tight text-zinc-900 dark:text-white leading-tight">
                Site<span className="text-accent">Mind</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                Admin Console
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">
            ROOT
          </span>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Section: Management */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-txt-secondary-light dark:text-txt-secondary-dark flex items-center gap-1.5">
              <span>Administration</span>
            </div>
            <div className="space-y-1">
              {managementNav.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-accent/10 text-accent font-bold border border-accent/25 shadow-sm'
                        : 'text-txt-secondary-light dark:text-txt-secondary-dark hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-surface-dark/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'opacity-70'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-accent" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Dedicated Analytics */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-txt-secondary-light dark:text-txt-secondary-dark flex items-center justify-between">
              <span>Platform Analytics</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono">
                OVERHAUL
              </span>
            </div>
            <div className="space-y-1">
              {analyticsNav.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-accent text-zinc-950 font-bold shadow-md shadow-accent/25'
                        : 'text-txt-secondary-light dark:text-txt-secondary-dark hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-surface-dark/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-950' : 'opacity-70'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-zinc-950" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Admin User & Theme & Logout */}
        <div className="p-3 border-t border-zinc-200 dark:border-border-dark bg-zinc-50/50 dark:bg-[#0c0c0f]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-surface-dark border border-zinc-200/60 dark:border-border-dark mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center font-bold text-xs shrink-0">
                {(user?.name || user?.email || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                  {user?.name || user?.email?.split('@')[0]}
                </div>
                <div className="text-[10px] text-accent font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Admin Role
                </div>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
