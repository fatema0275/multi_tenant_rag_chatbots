import React from 'react';
import { RefreshCw, Menu, Calendar } from 'lucide-react';
import { ADMIN_PAGES } from './AdminSidebar';

const PAGE_META = {
  [ADMIN_PAGES.OVERVIEW]: {
    title: 'Platform Overview',
    subtitle: 'System-wide high-level metrics, growth velocity, and platform activity.'
  },
  [ADMIN_PAGES.WEBSITE_HEALTH]: {
    title: 'Website Health & Fleet Monitor',
    subtitle: 'Inspect all registered domains, crawl status, chatbot health, and trigger maintenance.'
  },
  [ADMIN_PAGES.QUERY_INTELLIGENCE]: {
    title: 'Query Intelligence & NLI Analytics',
    subtitle: 'Cross-tenant query clusters, entailment verdict distributions, and semantic topic trends.'
  },
  [ADMIN_PAGES.USER_ACTIVITY]: {
    title: 'User Activity & Tenant Accounts',
    subtitle: 'Tenant registrations, active query traffic, account roles, and status enforcement.'
  },
  [ADMIN_PAGES.SYSTEM_PERFORMANCE]: {
    title: 'System Infrastructure & Performance',
    subtitle: 'P50/P90/P99 latency breakdown across pipeline stages, Groq limits, and crawl health.'
  },
  [ADMIN_PAGES.CONTENT_QUALITY]: {
    title: 'Content Quality & Knowledge Insights',
    subtitle: 'Retrieval gap analysis, chunk size calibration, source types, and semantic alignment.'
  },
  [ADMIN_PAGES.MANAGE_USERS]: {
    title: 'User Management',
    subtitle: 'Direct tenant account administration, credentials, and role adjustments.'
  },
  [ADMIN_PAGES.MANAGE_WEBSITES]: {
    title: 'Website Management',
    subtitle: 'Domain registration registry, verification records, and manual re-crawling.'
  }
};

const AdminHeader = ({
  activePage,
  dateRange,
  setDateRange,
  onRefresh,
  loading,
  onOpenMobileSidebar
}) => {
  const meta = PAGE_META[activePage] || {
    title: 'Admin Dashboard',
    subtitle: 'Platform-wide administration console'
  };

  const isAnalyticsPage = [
    ADMIN_PAGES.OVERVIEW,
    ADMIN_PAGES.WEBSITE_HEALTH,
    ADMIN_PAGES.QUERY_INTELLIGENCE,
    ADMIN_PAGES.USER_ACTIVITY,
    ADMIN_PAGES.SYSTEM_PERFORMANCE,
    ADMIN_PAGES.CONTENT_QUALITY
  ].includes(activePage);

  return (
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-[#09090B]/85 backdrop-blur-xl border-b border-zinc-200 dark:border-border-dark px-4 sm:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 -ml-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden cursor-pointer"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white leading-tight">
            {meta.title}
          </h1>
          <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5 line-clamp-1">
            {meta.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 self-end md:self-auto">
        {/* Shared Date Range Selector for Analytics */}
        {isAnalyticsPage && (
          <div className="flex items-center bg-zinc-100 dark:bg-surface-dark border border-zinc-200 dark:border-border-dark p-1 rounded-xl shadow-xs">
            <div className="hidden sm:flex items-center gap-1.5 px-2 text-[11px] font-bold text-txt-secondary-light dark:text-txt-secondary-dark">
              <Calendar className="w-3.5 h-3.5 text-accent" />
              <span>Range:</span>
            </div>
            {['7d', '30d', '90d'].map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  dateRange === r
                    ? 'bg-white dark:bg-[#202026] text-accent shadow-xs border border-zinc-200/50 dark:border-zinc-700/60'
                    : 'text-txt-secondary-light dark:text-txt-secondary-dark hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-surface-dark border border-zinc-200 dark:border-border-dark text-xs font-semibold text-zinc-900 dark:text-white hover:border-accent transition-all cursor-pointer shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-accent ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
};

export default AdminHeader;
