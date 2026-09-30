import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import {
  Search,
  MessageSquare,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Hash,
  Tag
} from 'lucide-react';
import SkeletonBlock from '../ui/SkeletonBlock';

const VERDICT_COLORS = {
  verified: '#22C55E', // Green
  partial: '#F59E0B',  // Amber
  fallback: '#EF4444', // Red/Rose
};

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl shadow-xl text-xs">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.payload.color }} />
        <span className="font-bold text-zinc-900 dark:text-white">{d.name}</span>
      </div>
      <div className="mt-1 font-mono text-[11px] text-zinc-500">
        Count: <strong className="text-zinc-900 dark:text-white">{d.value}</strong> ({d.payload.percentage}%)
      </div>
    </div>
  );
};

const QueryIntelligenceTab = ({ data, loading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVerdictFilter, setSelectedVerdictFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonBlock className="h-72 rounded-2xl" />
          <SkeletonBlock className="h-72 rounded-2xl" />
        </div>
        <SkeletonBlock className="h-96 rounded-2xl" />
      </div>
    );
  }

  const {
    top_questions = [],
    top_websites_by_volume = [],
    top_websites_by_fallback = [],
    verdict_distribution = [],
    topics_cloud = [],
    recent_queries = []
  } = data;

  // Pie chart formatted data
  const pieData = verdict_distribution.map((v) => ({
    name: v.name,
    value: v.count,
    percentage: v.percentage,
    color: VERDICT_COLORS[v.verdict] || '#71717A'
  }));

  // Filtering recent queries
  const filteredRecentQueries = useMemo(() => {
    let result = recent_queries;

    if (selectedVerdictFilter !== 'all') {
      result = result.filter((q) => q.verdict === selectedVerdictFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.query_text.toLowerCase().includes(q) ||
          item.domain.toLowerCase().includes(q)
      );
    }

    return result;
  }, [recent_queries, searchQuery, selectedVerdictFilter]);

  // Pagination (25 rows per page)
  const totalPages = Math.ceil(filteredRecentQueries.length / pageSize) || 1;
  const paginatedQueries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecentQueries.slice(start, start + pageSize);
  }, [filteredRecentQueries, currentPage]);

  return (
    <div className="space-y-8">
      {/* Top Section: Top Clustered Questions & Entailment Verdicts Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 20 Most Asked Clustered Questions */}
        <div className="lg:col-span-2 bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-6 rounded-[22px] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  Top 20 Most Frequent Inquiries (Clustered)
                </h3>
                <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
                  Semantic question clusters aggregated across all registered tenant chatbots.
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                PLATFORM-WIDE
              </span>
            </div>

            <div className="overflow-x-auto max-h-[360px] overflow-y-auto pr-1 divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {top_questions.length === 0 ? (
                <div className="p-8 text-center text-xs text-txt-secondary-light dark:text-txt-secondary-dark">
                  No clustered questions recorded yet.
                </div>
              ) : (
                top_questions.map((q, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-4 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/20 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-zinc-400 font-bold w-5 shrink-0 text-right">
                        #{idx + 1}
                      </span>
                      <span className="font-medium text-zinc-900 dark:text-white truncate max-w-[380px]">
                        "{q.question}"
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent font-bold text-[10px] font-mono">
                        {q.count} queries
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {q.sites_count} {q.sites_count === 1 ? 'site' : 'sites'}
                      </span>
                      {q.fallback_rate > 0 ? (
                        <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">
                          {q.fallback_rate}% fb
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          0% fb
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Entailment Verdicts Distribution Pie Chart */}
        <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-6 rounded-[22px] shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-heading text-base font-bold text-zinc-900 dark:text-white">
              Entailment Verdict Distribution
            </h3>
            <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5 mb-2">
              NLI verification verdicts across all generated RAG responses.
            </p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Verdict breakdown legend */}
          <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-border-dark">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-zinc-900 dark:text-white">
                  {item.percentage}% ({item.value})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Section: Top 10 by Volume & Top 10 by Fallback & Topic Word Cloud */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top 10 Websites by Query Volume */}
        <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-5 rounded-[22px] shadow-xs space-y-3">
          <div>
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-txt-secondary-light dark:text-txt-secondary-dark flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              Top 10 Sites by Volume
            </h4>
            <p className="text-[11px] text-zinc-400">Most active chatbots</p>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {top_websites_by_volume.map((site, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-zinc-900 dark:text-white truncate max-w-[170px]">
                    {site.domain}
                  </span>
                  <span className="font-mono text-zinc-500 font-semibold">{site.count} ({site.percentage}%)</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(site.percentage * 2.5, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 10 Websites by Fallback Rate */}
        <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-5 rounded-[22px] shadow-xs space-y-3">
          <div>
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              Top 10 by Fallback Rate
            </h4>
            <p className="text-[11px] text-zinc-400">Need content attention</p>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {top_websites_by_fallback.map((site, i) => (
              <div key={i} className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-border-dark flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <div className="font-bold text-zinc-900 dark:text-white truncate max-w-[150px]">
                    {site.domain}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {site.fallback_queries} of {site.total_queries} queries
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                  site.fallback_rate > 40 ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {site.fallback_rate}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Common Topics & Keywords Tag Cloud */}
        <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-5 rounded-[22px] shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-txt-secondary-light dark:text-txt-secondary-dark flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-accent" />
              Query Topic & Keyword Tags
            </h4>
            <p className="text-[11px] text-zinc-400">Frequent terms extracted across all logs</p>
            <div className="flex flex-wrap gap-1.5 pt-3 max-h-72 overflow-y-auto">
              {topics_cloud.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-xs flex items-center gap-1.5 hover:bg-accent hover:text-zinc-950 transition-colors cursor-default"
                >
                  <span>#{item.text}</span>
                  <span className="text-[10px] font-mono opacity-60">({item.value})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Searchable Table of Recent Queries Platform-Wide */}
      <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark rounded-[22px] overflow-hidden shadow-xs">
        <div className="p-5 border-b border-zinc-200/80 dark:border-border-dark flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-base font-bold text-zinc-900 dark:text-white">
              Recent Queries Platform-Wide
            </h3>
            <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
              Inspect real-time conversation queries, entailment verdicts, and latency.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Verdict filter */}
            <select
              value={selectedVerdictFilter}
              onChange={(e) => {
                setSelectedVerdictFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-border-dark text-xs font-semibold text-zinc-800 dark:text-zinc-200"
            >
              <option value="all">All Verdicts</option>
              <option value="verified">Verified Only</option>
              <option value="partial">Partial Only</option>
              <option value="fallback">Fallback Only</option>
            </select>

            {/* Keyword / Domain search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary-light dark:text-txt-secondary-dark" />
              <input
                type="text"
                placeholder="Search domain or keyword..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-border-dark text-zinc-900 dark:text-white focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200/80 dark:border-border-dark bg-zinc-50/75 dark:bg-surface-dark/75 text-txt-secondary-light dark:text-txt-secondary-dark">
                <th className="py-3 px-4 font-bold">Query Text</th>
                <th className="py-3 px-4 font-bold">Website Domain</th>
                <th className="py-3 px-4 font-bold">NLI Verdict</th>
                <th className="py-3 px-4 font-bold">Response Time</th>
                <th className="py-3 px-4 font-bold">Timestamp</th>
                <th className="py-3 px-4 font-bold">Fallback Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {paginatedQueries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-txt-secondary-light dark:text-txt-secondary-dark">
                    No recent queries found matching your search.
                  </td>
                </tr>
              ) : (
                paginatedQueries.map((q) => (
                  <tr key={q.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3 px-4 font-medium text-zinc-900 dark:text-white max-w-[320px] truncate">
                      "{q.query_text}"
                    </td>
                    <td className="py-3 px-4 text-txt-secondary-light dark:text-txt-secondary-dark font-mono">
                      {q.domain}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        q.verdict === 'verified'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : q.verdict === 'partial'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {q.verdict}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                      {q.response_time} ms
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">
                      {q.timestamp ? new Date(q.timestamp).toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                      {q.fallback_reason || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (25 rows per page) */}
        <div className="p-4 border-t border-zinc-200/80 dark:border-border-dark flex items-center justify-between text-xs text-txt-secondary-light dark:text-txt-secondary-dark">
          <span>
            Showing {filteredRecentQueries.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredRecentQueries.length)} of {filteredRecentQueries.length} queries
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-border-dark disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-bold text-zinc-900 dark:text-white">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-border-dark disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueryIntelligenceTab;
