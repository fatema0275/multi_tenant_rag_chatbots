import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Globe,
  Layers,
  FileText,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';

const WebsiteDetailDrawer = ({
  website,
  detail,
  isOpen,
  onClose,
  onTriggerCrawl
}) => {
  if (!isOpen || !website) return null;

  const sparklineData = detail?.sparkline || [];
  const topQueries = detail?.top_queries || [];
  const recentCrawls = detail?.recent_crawls || [];
  const syncHistory = detail?.sync_history || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="w-screen max-w-xl bg-white dark:bg-[#111115] border-l border-zinc-200 dark:border-border-dark flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-200 dark:border-border-dark flex items-start justify-between bg-zinc-50/50 dark:bg-surface-dark/50">
              <div className="space-y-1 pr-6">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-accent" />
                  <h2 className="font-heading text-lg font-bold text-zinc-900 dark:text-white truncate">
                    {website.domain}
                  </h2>
                </div>
                <div className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark flex items-center gap-2">
                  <span>Owner: {website.owner_email}</span>
                  <span>•</span>
                  <span className="capitalize">{website.verification_status}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Quick Stat Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-surface-dark border border-zinc-200/60 dark:border-border-dark">
                  <div className="text-[11px] font-medium text-txt-secondary-light dark:text-txt-secondary-dark">
                    Chunks
                  </div>
                  <div className="text-lg font-heading font-extrabold text-zinc-900 dark:text-white tabular-nums mt-0.5">
                    {website.total_chunks.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-surface-dark border border-zinc-200/60 dark:border-border-dark">
                  <div className="text-[11px] font-medium text-txt-secondary-light dark:text-txt-secondary-dark">
                    Pages
                  </div>
                  <div className="text-lg font-heading font-extrabold text-zinc-900 dark:text-white tabular-nums mt-0.5">
                    {website.total_pages.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-surface-dark border border-zinc-200/60 dark:border-border-dark">
                  <div className="text-[11px] font-medium text-txt-secondary-light dark:text-txt-secondary-dark">
                    Queries
                  </div>
                  <div className="text-lg font-heading font-extrabold text-accent tabular-nums mt-0.5">
                    {website.total_queries.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-surface-dark border border-zinc-200/60 dark:border-border-dark">
                  <div className="text-[11px] font-medium text-txt-secondary-light dark:text-txt-secondary-dark">
                    Fallback
                  </div>
                  <div className={`text-lg font-heading font-extrabold tabular-nums mt-0.5 ${
                    website.fallback_rate > 40 ? 'text-rose-500' : 'text-emerald-500'
                  }`}>
                    {website.fallback_rate}%
                  </div>
                </div>
              </div>

              {/* Query Trend Sparkline */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-surface-dark border border-zinc-200/60 dark:border-border-dark space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-accent" />
                    Query Volume Trend (Last 14 Days)
                  </span>
                  <span className="text-[11px] text-txt-secondary-light dark:text-txt-secondary-dark font-mono">
                    Total: {website.total_queries}
                  </span>
                </div>
                <div className="h-16 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData}>
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#22C55E"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-zinc-900 text-white text-[10px] px-2 py-1 rounded shadow">
                                {payload[0].payload.date}: {payload[0].value} queries
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top 5 Queries */}
              <div>
                <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-txt-secondary-light dark:text-txt-secondary-dark mb-2.5">
                  Top 5 User Inquiries
                </h3>
                {topQueries.length === 0 ? (
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-surface-dark text-center text-xs text-txt-secondary-light dark:text-txt-secondary-dark border border-dashed border-zinc-200 dark:border-zinc-800">
                    No queries logged for this website yet.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {topQueries.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-zinc-50 dark:bg-surface-dark border border-zinc-200/50 dark:border-border-dark flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-zinc-900 dark:text-white truncate max-w-[280px]">
                          "{q.query_text}"
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-bold text-[10px]">
                            {q.count}x
                          </span>
                          {q.fallback_count > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-bold text-[10px]">
                              {q.fallback_count} fb
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Crawl Logs */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-txt-secondary-light dark:text-txt-secondary-dark">
                    Recent Crawl Jobs
                  </h3>
                  <button
                    onClick={() => onTriggerCrawl(website.id)}
                    className="text-xs text-accent hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3" />
                    Force Crawl
                  </button>
                </div>
                {recentCrawls.length === 0 ? (
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-surface-dark text-center text-xs text-txt-secondary-light dark:text-txt-secondary-dark border border-dashed border-zinc-200 dark:border-zinc-800">
                    No crawl logs found.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentCrawls.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-zinc-50 dark:bg-surface-dark border border-zinc-200/50 dark:border-border-dark text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            c.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : c.status === 'failed'
                              ? 'bg-rose-500/10 text-rose-500'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {c.status}
                          </span>
                          <span className="text-[11px] text-zinc-400 font-mono">
                            {c.started_at ? new Date(c.started_at).toLocaleDateString() : '-'}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-600 dark:text-zinc-300">
                          Pages Crawled: <strong className="text-zinc-900 dark:text-white">{c.pages_crawled}</strong> / Found: {c.pages_found}
                        </div>
                        {c.error_message && (
                          <div className="text-[11px] text-rose-400 font-mono bg-rose-500/5 p-1 rounded">
                            {c.error_message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sync History */}
              <div>
                <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-txt-secondary-light dark:text-txt-secondary-dark mb-2.5">
                  Knowledge Sync History
                </h3>
                {syncHistory.length === 0 ? (
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-surface-dark text-center text-xs text-txt-secondary-light dark:text-txt-secondary-dark border border-dashed border-zinc-200 dark:border-zinc-800">
                    No sync logs recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {syncHistory.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl bg-zinc-50 dark:bg-surface-dark border border-zinc-200/50 dark:border-border-dark text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-900 dark:text-white">
                            Sync #{s.id}
                          </span>
                          <span className="text-[11px] text-zinc-400 font-mono">
                            {s.synced_at ? new Date(s.synced_at).toLocaleString() : '-'}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                          <div>Checked: {s.pages_checked}</div>
                          <div>Updated: {s.pages_updated}</div>
                          <div>Added: {s.pages_added}</div>
                          <div>Removed: {s.pages_removed}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-border-dark flex items-center justify-between bg-zinc-50/50 dark:bg-surface-dark/50">
              <span className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark font-mono">
                Site ID: {website.site_id?.slice(0, 13) || website.id}...
              </span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default WebsiteDetailDrawer;
