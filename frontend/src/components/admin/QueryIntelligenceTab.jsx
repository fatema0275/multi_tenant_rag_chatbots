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
    <div className="bg-[#131318] border border-[#27272A] p-2.5 rounded-[12px] shadow-xl text-xs space-y-1">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.payload.color }} />
        <span className="font-semibold text-white">{d.name}</span>
      </div>
      <div className="text-[11px] text-zinc-400">
        Count: <strong className="text-white tabular-nums">{d.value}</strong> ({d.payload.percentage}%)
      </div>
    </div>
  );
};

const QueryIntelligenceTab = ({ data, loading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVerdictFilter, setSelectedVerdictFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const {
    top_questions = [],
    top_websites_by_volume = [],
    top_websites_by_fallback = [],
    verdict_distribution = [],
    topics_cloud = [],
    recent_queries = []
  } = data || {};

  // Pie chart formatted data
  const pieData = useMemo(() => {
    return verdict_distribution.map((v) => ({
      name: v.name,
      value: v.count,
      percentage: v.percentage,
      color: VERDICT_COLORS[v.verdict] || '#71717A'
    }));
  }, [verdict_distribution]);

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
          item.query_text?.toLowerCase().includes(q) ||
          item.domain?.toLowerCase().includes(q)
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

  return (
    <div className="space-y-6 font-sans">
      {/* Top Section: Top Clustered Questions & Entailment Verdicts Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top 20 Most Asked Clustered Questions */}
        <div className="lg:col-span-2 bg-[#131318] border border-[#27272A] p-5 rounded-[16px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Most Frequent Inquiries (Clustered)
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Semantic question clusters aggregated across all registered tenant chatbots.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[340px] overflow-y-auto pr-1 divide-y divide-[#27272A]/50">
              {top_questions.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  No clustered questions recorded yet.
                </div>
              ) : (
                top_questions.map((q, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-4 text-xs hover:bg-[#181820] px-2 rounded-[8px] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-zinc-500 font-medium w-5 shrink-0 text-right">
                        #{idx + 1}
                      </span>
                      <span className="font-medium text-white truncate max-w-[380px]">
                        "{q.question}"
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="px-2 py-0.5 rounded-[6px] bg-[#27272A] text-zinc-300 font-medium text-[11px]">
                        {q.count} {q.count === 1 ? 'query' : 'queries'}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {q.sites_count} {q.sites_count === 1 ? 'site' : 'sites'}
                      </span>
                      {q.fallback_rate > 0 ? (
                        <span className="text-[11px] font-medium text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-[4px]">
                          {q.fallback_rate}% fb
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-[4px]">
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
        <div className="bg-[#131318] border border-[#27272A] p-5 rounded-[16px] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Entailment Verdict Distribution
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5 mb-2">
              NLI verification verdicts across all generated RAG responses.
            </p>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
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
          <div className="space-y-1.5 pt-3 border-t border-[#27272A]/50">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-zinc-300 font-medium">{item.name}</span>
                </div>
                <span className="text-white font-medium tabular-nums">
                  {item.percentage}% ({item.value})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Section: Top 10 by Volume & Top 10 by Fallback & Topic Word Cloud */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top 10 Websites by Query Volume */}
        <div className="bg-[#131318] border border-[#27272A] p-5 rounded-[16px] space-y-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              Top Sites by Volume
            </h4>
            <p className="text-[11px] text-zinc-500">Most active chatbots</p>
          </div>
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {top_websites_by_volume.map((site, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-white truncate max-w-[170px]">
                    {site.domain}
                  </span>
                  <span className="text-zinc-400 tabular-nums">{site.count} ({site.percentage}%)</span>
                </div>
                <div className="h-1.5 w-full bg-[#27272A] rounded-full overflow-hidden">
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
        <div className="bg-[#131318] border border-[#27272A] p-5 rounded-[16px] space-y-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Top Sites by Fallback Rate
            </h4>
            <p className="text-[11px] text-zinc-500">Need content coverage attention</p>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {top_websites_by_fallback.map((site, i) => (
              <div key={i} className="p-2 rounded-[8px] bg-[#09090B] border border-[#27272A] flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <div className="font-medium text-white truncate max-w-[150px]">
                    {site.domain}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {site.fallback_queries} of {site.total_queries} queries
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-medium ${
                  site.fallback_rate > 40 ? 'bg-rose-500/15 text-rose-400' : 'bg-amber-500/15 text-amber-400'
                }`}>
                  {site.fallback_rate}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Common Topics & Keywords Tag Cloud */}
        <div className="bg-[#131318] border border-[#27272A] p-5 rounded-[16px] space-y-3 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-zinc-400" />
              Query Topics & Keywords
            </h4>
            <p className="text-[11px] text-zinc-500">Frequent terms extracted across logs</p>
            <div className="flex flex-wrap gap-1.5 pt-3 max-h-64 overflow-y-auto">
              {topics_cloud.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-[8px] bg-[#09090B] border border-[#27272A] text-zinc-300 text-xs flex items-center gap-1.5 hover:border-zinc-500 transition-colors cursor-default"
                >
                  <span>#{item.text}</span>
                  <span className="text-[10px] text-zinc-500">({item.value})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Searchable Table of Recent Queries Platform-Wide */}
      <div className="bg-[#131318] border border-[#27272A] rounded-[16px] overflow-hidden">
        <div className="p-5 border-b border-[#27272A] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Recent Queries Platform-Wide
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Inspect conversation queries, entailment verdicts, and latency.
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
              className="h-9 px-3 rounded-[10px] bg-[#09090B] border border-[#27272A] text-xs text-zinc-300 focus:outline-none focus:border-[#22C55E] transition-colors cursor-pointer"
            >
              <option value="all">All Verdicts</option>
              <option value="verified">Verified Only</option>
              <option value="partial">Partial Only</option>
              <option value="fallback">Fallback Only</option>
            </select>

            {/* Keyword / Domain search */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search domain or keyword..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 pl-8 pr-3 text-xs rounded-[10px] bg-[#09090B] border border-[#27272A] text-white placeholder-zinc-500 focus:outline-none focus:border-[#22C55E] transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#27272A] bg-[#0E0E12] text-zinc-400">
                <th className="py-3 px-4 font-medium">Query Text</th>
                <th className="py-3 px-4 font-medium">Website Domain</th>
                <th className="py-3 px-4 font-medium">NLI Verdict</th>
                <th className="py-3 px-4 font-medium">Latency</th>
                <th className="py-3 px-4 font-medium">Timestamp</th>
                <th className="py-3 px-4 font-medium">Fallback Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]/60">
              {paginatedQueries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-zinc-500">
                    No recent queries found matching your search.
                  </td>
                </tr>
              ) : (
                paginatedQueries.map((q) => (
                  <tr key={q.id} className="hover:bg-[#181820] transition-colors">
                    <td className="py-3 px-4 font-medium text-white max-w-[320px] truncate">
                      "{q.query_text}"
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      {q.domain}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-medium uppercase ${
                        q.verdict === 'verified'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : q.verdict === 'partial'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}>
                        {q.verdict}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium tabular-nums text-zinc-300">
                      {q.response_time} ms
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {q.timestamp ? new Date(q.timestamp).toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {q.fallback_reason || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-[#27272A] flex items-center justify-between text-xs text-zinc-400">
          <span>
            Showing {filteredRecentQueries.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredRecentQueries.length)} of {filteredRecentQueries.length} queries
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-[6px] border border-[#27272A] bg-[#09090B] disabled:opacity-40 hover:bg-[#1C1C24] cursor-pointer text-zinc-300"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-medium text-white">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-[6px] border border-[#27272A] bg-[#09090B] disabled:opacity-40 hover:bg-[#1C1C24] cursor-pointer text-zinc-300"
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
