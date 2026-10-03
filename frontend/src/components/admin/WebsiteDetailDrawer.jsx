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
            className="w-screen max-w-xl bg-[#131318] border-l border-[#27272A] flex flex-col shadow-2xl text-white font-sans"
          >
            {/* Header */}
            <div className="p-6 border-b border-[#27272A] flex items-start justify-between bg-[#0E0E12]">
              <div className="space-y-1 pr-6">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#22C55E]" />
                  <h2 className="text-lg font-bold text-white truncate tracking-tight">
                    {website.domain}
                  </h2>
                </div>
                <div className="text-xs text-zinc-400 flex items-center gap-2">
                  <span>Owner: {website.owner_email}</span>
                  <span>•</span>
                  <span className="capitalize">{website.verification_status}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-[8px] text-zinc-400 hover:text-white hover:bg-[#1C1C24] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Quick Stat Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-[12px] bg-[#09090B] border border-[#27272A]">
                  <div className="text-[11px] font-medium text-zinc-400">
                    Chunks
                  </div>
                  <div className="text-lg font-bold text-white tabular-nums mt-0.5">
                    {website.total_chunks.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-[12px] bg-[#09090B] border border-[#27272A]">
                  <div className="text-[11px] font-medium text-zinc-400">
                    Pages
                  </div>
                  <div className="text-lg font-bold text-white tabular-nums mt-0.5">
                    {website.total_pages.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-[12px] bg-[#09090B] border border-[#27272A]">
                  <div className="text-[11px] font-medium text-zinc-400">
                    Queries
                  </div>
                  <div className="text-lg font-bold text-white tabular-nums mt-0.5">
                    {website.total_queries.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-[12px] bg-[#09090B] border border-[#27272A]">
                  <div className="text-[11px] font-medium text-zinc-400">
                    Fallback
                  </div>
                  <div className={`text-lg font-bold tabular-nums mt-0.5 ${
                    website.fallback_rate > 40 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {website.fallback_rate}%
                  </div>
                </div>
              </div>

              {/* Query Trend Sparkline */}
              <div className="p-4 rounded-[12px] bg-[#09090B] border border-[#27272A] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#22C55E]" />
                    Query Volume Trend (Last 14 Days)
                  </span>
                  <span className="text-[11px] text-zinc-400">
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
                              <div className="bg-[#131318] border border-[#27272A] text-white text-[10px] px-2 py-1 rounded-[6px] shadow">
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
                <h3 className="text-xs font-semibold text-zinc-400 mb-2.5">
                  Top 5 User Inquiries
                </h3>
                {topQueries.length === 0 ? (
                  <div className="p-4 rounded-[12px] bg-[#09090B] text-center text-xs text-zinc-500 border border-[#27272A]">
                    No queries logged for this website yet.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {topQueries.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-[10px] bg-[#09090B] border border-[#27272A] flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-white truncate max-w-[280px]">
                          "{q.query_text}"
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-[6px] bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20 font-medium text-[10px] tabular-nums">
                            {q.count}x
                          </span>
                          {q.fallback_count > 0 && (
                            <span className="px-1.5 py-0.5 rounded-[6px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium text-[10px] tabular-nums">
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
                  <h3 className="text-xs font-semibold text-zinc-400">
                    Recent Crawl Jobs
                  </h3>
                  <button
                    onClick={() => onTriggerCrawl(website.id)}
                    className="text-xs text-[#22C55E] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3" />
                    Force Crawl
                  </button>
                </div>
                {recentCrawls.length === 0 ? (
                  <div className="p-4 rounded-[12px] bg-[#09090B] text-center text-xs text-zinc-500 border border-[#27272A]">
                    No crawl logs found.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentCrawls.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-[10px] bg-[#09090B] border border-[#27272A] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-medium capitalize border ${
                            c.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : c.status === 'failed'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {c.status}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {c.started_at ? new Date(c.started_at).toLocaleDateString() : '-'}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          Pages Crawled: <strong className="text-white">{c.pages_crawled}</strong> / Found: {c.pages_found}
                        </div>
                        {c.error_message && (
                          <div className="text-[11px] text-rose-400 bg-rose-500/10 p-1.5 rounded-[6px]">
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
                <h3 className="text-xs font-semibold text-zinc-400 mb-2.5">
                  Knowledge Sync History
                </h3>
                {syncHistory.length === 0 ? (
                  <div className="p-4 rounded-[12px] bg-[#09090B] text-center text-xs text-zinc-500 border border-[#27272A]">
                    No sync logs recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {syncHistory.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-[10px] bg-[#09090B] border border-[#27272A] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">
                            Sync #{s.id}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {s.synced_at ? new Date(s.synced_at).toLocaleString() : '-'}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-[11px] text-zinc-400">
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
            <div className="p-4 border-t border-[#27272A] flex items-center justify-between bg-[#0E0E12]">
              <span className="text-xs text-zinc-500 font-mono">
                Site ID: {website.site_id?.slice(0, 13) || website.id}...
              </span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-[10px] bg-[#27272A] hover:bg-[#323238] text-white text-xs font-medium transition-colors cursor-pointer"
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
