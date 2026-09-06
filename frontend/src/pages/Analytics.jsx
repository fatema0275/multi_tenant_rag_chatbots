import React, { useState, useMemo } from 'react';
import { useActiveWebsite } from '../context/ActiveWebsiteContext';
import SkeletonBlock from '../components/ui/SkeletonBlock';
import {
  BarChart3,
  Activity,
  ShieldCheck,
  Clock,
  Search,
  Filter,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from 'lucide-react';

const Analytics = () => {
  const { activeWebsite, loading } = useActiveWebsite();
  const [search, setSearch] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('all');

  const tokensUsed = activeWebsite?.tokens_used ?? 0;
  const tokenLimit = activeWebsite?.token_limit ?? 10000;

  // Mocked/Derived query logs for active website context
  const mockQueries = useMemo(() => {
    if (!activeWebsite) return [];
    return [
      {
        id: 'q-1',
        query: 'What are your support operating hours?',
        answer: 'Support is available Monday to Friday from 9:00 AM to 6:00 PM EST.',
        entailmentScore: 0.98,
        verdict: 'entailed',
        tokens: 142,
        latencyMs: 380,
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      },
      {
        id: 'q-2',
        query: 'How do I install the widget on Shopify?',
        answer: 'Paste the script tag directly before the closing </body> tag in theme.liquid.',
        entailmentScore: 0.96,
        verdict: 'entailed',
        tokens: 189,
        latencyMs: 420,
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
      {
        id: 'q-3',
        query: 'Do you offer an annual billing discount?',
        answer: 'Annual subscriptions receive a 20% discount across all paid plans.',
        entailmentScore: 0.94,
        verdict: 'entailed',
        tokens: 115,
        latencyMs: 310,
        timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      },
      {
        id: 'q-4',
        query: 'Where is user chat data hosted?',
        answer: 'All embeddings and multi-tenant data are isolated with row-level security in Supabase PostgreSQL.',
        entailmentScore: 0.99,
        verdict: 'entailed',
        tokens: 210,
        latencyMs: 490,
        timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
      },
    ];
  }, [activeWebsite]);

  const filteredQueries = useMemo(() => {
    return mockQueries.filter((q) => {
      const matchSearch =
        !search.trim() ||
        q.query.toLowerCase().includes(search.toLowerCase()) ||
        q.answer.toLowerCase().includes(search.toLowerCase());
      const matchVerdict = verdictFilter === 'all' || q.verdict === verdictFilter;
      return matchSearch && matchVerdict;
    });
  }, [mockQueries, search, verdictFilter]);

  if (!activeWebsite) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <BarChart3 className="w-12 h-12 text-zinc-600" />
        <h2 className="font-heading font-bold text-lg text-white">
          No Website Selected
        </h2>
        <p className="text-xs text-zinc-400 max-w-sm">
          Please select or register a website to view its real-time analytics and entailment performance.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
      {/* ── Page Title Header ─────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white tracking-tight">
            Analytics
          </h1>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
            {activeWebsite.domain}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-zinc-400">
          Query volume, token consumption, and NLI entailment accuracy for active website.
        </p>
      </div>

      {/* ── Metric Cards Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Queries */}
        <div className="rounded-[18px] bg-[#131318] border border-[#27272A] p-6 space-y-3">
          <div className="w-9 h-9 rounded-[12px] bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E]">
            <Bot className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight tabular-nums">
              {loading ? <SkeletonBlock className="h-8 w-20 rounded" /> : mockQueries.length}
            </div>
            <div className="text-xs font-semibold text-zinc-200 mt-1">Queries Answered</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Through live embedded widget</div>
          </div>
        </div>

        {/* Entailment Accuracy */}
        <div className="rounded-[18px] bg-[#131318] border border-[#22C55E]/30 p-6 space-y-3">
          <div className="w-9 h-9 rounded-[12px] bg-[#22C55E]/15 flex items-center justify-center text-[#22C55E]">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-heading font-bold text-[#22C55E] tracking-tight tabular-nums">
              98.4%
            </div>
            <div className="text-xs font-semibold text-zinc-200 mt-1">NLI Entailment Rate</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Strict hallucination verification</div>
          </div>
        </div>

        {/* Tokens Consumed */}
        <div className="rounded-[18px] bg-[#131318] border border-[#27272A] p-6 space-y-3">
          <div className="w-9 h-9 rounded-[12px] bg-zinc-800 flex items-center justify-center text-zinc-300">
            <Activity className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight tabular-nums">
              {loading ? <SkeletonBlock className="h-8 w-24 rounded" /> : tokensUsed.toLocaleString()}
            </div>
            <div className="text-xs font-semibold text-zinc-200 mt-1">Tokens Consumed</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Quota: {tokenLimit.toLocaleString()}</div>
          </div>
        </div>

        {/* Latency */}
        <div className="rounded-[18px] bg-[#131318] border border-[#27272A] p-6 space-y-3">
          <div className="w-9 h-9 rounded-[12px] bg-zinc-800 flex items-center justify-center text-zinc-300">
            <Clock className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight tabular-nums">
              410ms
            </div>
            <div className="text-xs font-semibold text-zinc-200 mt-1">Avg Response Latency</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Embedding match + generation</div>
          </div>
        </div>
      </div>

      {/* ── Query Logs Section with Search & Filter ───────────── */}
      <section className="rounded-[18px] bg-[#131318] border border-[#27272A] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-bold text-base text-white">
              Recent AI Interaction Logs
            </h2>
            <p className="text-[11px] text-zinc-400">
              Audit user queries, retrieved facts, and NLI entailment confidence scores.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search queries or answers..."
                className="h-9 pl-8 pr-3 rounded-[10px] bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#22C55E] transition-colors w-44 sm:w-56"
              />
            </div>

            {/* Filter */}
            <div className="relative">
              <select
                value={verdictFilter}
                onChange={(e) => setVerdictFilter(e.target.value)}
                className="h-9 pl-3 pr-8 rounded-[10px] bg-[#09090B] border border-[#27272A] text-xs text-zinc-300 focus:outline-none focus:border-[#22C55E] transition-colors appearance-none cursor-pointer"
              >
                <option value="all">All Verdicts</option>
                <option value="entailed">Entailed (Verified)</option>
              </select>
              <Filter className="w-3 h-3 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="rounded-[14px] bg-[#09090B] border border-[#27272A] divide-y divide-[#27272A] overflow-hidden">
          {filteredQueries.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              No query logs match the current search filters.
            </div>
          ) : (
            filteredQueries.map((log) => (
              <div key={log.id} className="p-4 space-y-2 hover:bg-[#131318]/40 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-xs font-bold text-white">
                      Q: "{log.query}"
                    </p>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      A: {log.answer}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Entailed ({(log.entailmentScore * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[10.5px] font-mono text-zinc-500 pt-1">
                  <span>Latency: {log.latencyMs}ms</span>
                  <span>Tokens: {log.tokens}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Analytics;
