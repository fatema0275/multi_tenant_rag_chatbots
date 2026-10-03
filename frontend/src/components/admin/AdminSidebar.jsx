import React from 'react';
import {
  LayoutDashboard,
  Globe,
  MessageSquare,
  Users,
  Activity,
  BookOpen,
  Zap,
  LogOut
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

  // Management Section
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
    { id: ADMIN_PAGES.MANAGE_USERS, label: 'User Management', icon: Users },
    { id: ADMIN_PAGES.MANAGE_WEBSITES, label: 'Website Management', icon: Globe },
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
        className={`fixed top-0 bottom-0 left-0 z-50 w-60 lg:w-64 bg-[#131318] border-r border-[#27272A] flex flex-col font-sans transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="px-5 pt-4 pb-3 border-b border-[#27272A]/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-[#22C55E] flex items-center justify-center shadow-sm">
              <Zap className="w-4.5 h-4.5 text-[#09090B]" strokeWidth={2.5} />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white">
                Site<span className="text-[#22C55E]">Mind</span>
              </span>
              <span className="block text-[11px] font-medium text-zinc-400 -mt-0.5">
                Admin Console
              </span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {/* Section: Management */}
          <div>
            <div className="px-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Administration
            </div>
            <div className="space-y-0.5">
              {managementNav.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all text-left ${
                      isActive
                        ? 'border-l-[3px] border-[#22C55E] text-white bg-[#1C1C24]'
                        : 'border-l-[3px] border-transparent text-zinc-400 hover:text-white hover:bg-[#1C1C24]/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Dedicated Analytics */}
          <div>
            <div className="px-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Platform Analytics
            </div>
            <div className="space-y-0.5">
              {analyticsNav.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all text-left ${
                      isActive
                        ? 'border-l-[3px] border-[#22C55E] text-white bg-[#1C1C24]'
                        : 'border-l-[3px] border-transparent text-zinc-400 hover:text-white hover:bg-[#1C1C24]/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Admin User & Theme & Logout */}
        <div className="p-4 border-t border-[#27272A] bg-[#0E0E12] mt-auto">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-xs font-bold text-[#22C55E] shrink-0">
                {(user?.name || user?.email || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-white truncate max-w-[130px]">
                  {user?.name || user?.email?.split('@')[0]}
                </div>
                <div className="text-[11px] text-zinc-400">
                  Administrator
                </div>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
