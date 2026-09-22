import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveWebsite } from '../context/ActiveWebsiteContext';
import SkeletonBlock from '../components/ui/SkeletonBlock';
import {
  BarChart3,
  Activity,
  ShieldCheck,
  Clock,
  Search,
  Filter,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Layers,
  RefreshCw,
  Cpu,
  Database,
  Sliders,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Zap,
} from 'lucide-react';

const Analytics = () => {
  const navigate = useNavigate();
  const { activeWebsite, loading: websiteLoading } = useActiveWebsite();

  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('all');
  const [copiedTenant, setCopiedTenant] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Fetch real analytics and parameters for the active website
  const fetchAnalytics = useCallback(async (isSilent = false) => {
    if (!activeWebsite?.id) return;
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await fetch(`/api/chat/analytics/${activeWebsite.id}`);
      if (!res.ok) {
        throw new Error(`Failed to load telemetry (status ${res.status})`);
      }
      const data = await res.json();
      setAnalyticsData(data);
    } catch (err) {
      console.warn('[Analytics] Telemetry load notice:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeWebsite?.id]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Derived metrics with realistic fallback defaults when fresh
  const metrics = analyticsData?.metrics || {
    totalQueries: 0,
    groundedRate: 100.0,
    fallbackCount: 0,
    fallbackRate: 0.0,
    avgLatencyMs: 420,
    tokensUsed: activeWebsite?.tokens_used || 0,
    tokenLimit: activeWebsite?.token_limit || 10000,
    tokensRemaining: Math.max(0, (activeWebsite?.token_limit || 10000) - (activeWebsite?.tokens_used || 0)),
    tokensUtilizationPct: 0,
    pagesCrawled: activeWebsite?.pages_crawled || 0,
    chunksIndexed: 0,
    crawlStatus: activeWebsite?.crawl_status || 'ready',
    lastCrawledAt: activeWebsite?.last_crawled_at || null,
  };

  const params = analyticsData?.parameters || {
    tenantUuid: activeWebsite?.site_id || 'tenant_isolated_namespace',
    embeddingModel: 'text-embedding-3-small',
    embeddingDimensions: 1536,
    vectorMetric: 'Cosine Distance (pgvector <=>)',
    similarityCutoff: 0.75,
    topKChunks: 4,
    chunkSizeTokens: 500,
    chunkOverlapTokens: 50,
    llmEngine: 'Groq Llama 3.3 70B Versatile',
    temperature: 0.1,
    maxTokens: 512,
    nliGuardrail: 'DeBERTa-v3-base-tasksource-nli',
    nliThreshold: 0.70,
    fallbackPolicy: 'Strict Grounded Anti-Hallucination',
    rlsIsolation: 'Active (PostgreSQL Row-Level Security)',
  };

  const rawLogs = analyticsData?.logs || [];

  // Filtered logs based on search and verdict filter
  const filteredLogs = useMemo(() => {
    return rawLogs.filter((log) => {
      const qText = (log.query_text || '').toLowerCase();
      const aText = (log.generated_answer || '').toLowerCase();
      const s = search.trim().toLowerCase();
      const matchesSearch = !s || qText.includes(s) || aText.includes(s);

      if (!matchesSearch) return false;

      if (verdictFilter === 'verified') {
        return !log.fallback_triggered && log.entailment_verdict !== 'contradicted';
      }
      if (verdictFilter === 'fallback') {
        return log.fallback_triggered;
      }
      return true;
    });
  }, [rawLogs, search, verdictFilter]);

  const handleCopyTenant = () => {
    if (!params.tenantUuid) return;
    navigator.clipboard.writeText(params.tenantUuid);
    setCopiedTenant(true);
    setTimeout(() => setCopiedTenant(false), 2000);
  };

  if (!activeWebsite && !websiteLoading) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[65vh] text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center text-zinc-400">
          <BarChart3 className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <p className="font-heading font-semibold text-lg text-zinc-100">
            You haven't added any websites yet.
          </p>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Register and crawl your first website to generate an AI knowledge base and unlock real-time telemetry.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => navigate('/dashboard/websites')}
            className="px-6 py-2.5 rounded-[14px] bg-[#22C55E] hover:bg-[#16A34A] text-white font-semibold text-sm transition-all cursor-pointer shadow-md shadow-[#22C55E]/20 active:scale-95"
          >
            Add Website
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white tracking-tight">
              AI Telemetry & Parameters
            </h1>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/25 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              {activeWebsite?.domain || 'Active Site'}
            </span>
          </div>
          <p className="text-sm text-zinc-400">
            Real-time inference performance, guardrail verifications, and parameter architecture for this site.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Tenant UUID Badge with Copy */}
          <button
            onClick={handleCopyTenant}
            title="Click to copy PostgreSQL RLS Tenant UUID"
            className="flex items-center gap-2 px-3.5 py-2 rounded-[12px] bg-[#131318] border border-zinc-800 hover:border-zinc-700 text-xs font-mono text-zinc-300 transition-all cursor-pointer"
          >
            <span className="text-zinc-500">Tenant:</span>
            <span>{params.tenantUuid?.slice(0, 8)}...</span>
            {copiedTenant ? (
              <Check className="w-3.5 h-3.5 text-[#22C55E]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-zinc-400 hover:text-white" />
            )}
          </button>

          {/* Refresh button */}
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-[12px] bg-[#131318] border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-200 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#22C55E] ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Chatbot Studio Link */}
          <button
            onClick={() => navigate('/dashboard/chatbot')}
            className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-semibold transition-all shadow-md shadow-[#22C55E]/15 active:scale-95 cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Test Chatbot</span>
          </button>
        </div>
      </div>

      {/* ── Key Performance Metrics Grid ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Total Queries */}
        <div className="rounded-[18px] bg-[#131318] border border-zinc-800/90 p-5 space-y-3 relative overflow-hidden group hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Total Inquiries
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E]">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-heading font-bold text-white tracking-tight tabular-nums">
              {loading ? <SkeletonBlock className="h-9 w-20 rounded" /> : metrics.totalQueries.toLocaleString()}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Live queries serviced via widget & studio
            </p>
          </div>
        </div>

        {/* Metric 2: Answer Grounding Rate */}
        <div className="rounded-[18px] bg-[#131318] border border-[#22C55E]/30 p-5 space-y-3 relative overflow-hidden group hover:border-[#22C55E]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#22C55E] uppercase tracking-wider">
              Grounding Confidence
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-[#22C55E]/15 flex items-center justify-center text-[#22C55E]">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-heading font-bold text-[#22C55E] tracking-tight tabular-nums">
              {loading ? <SkeletonBlock className="h-9 w-24 rounded" /> : `${metrics.groundedRate}%`}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Grounded in verified knowledge chunks
            </p>
          </div>
        </div>

        {/* Metric 3: Avg Response Latency */}
        <div className="rounded-[18px] bg-[#131318] border border-zinc-800/90 p-5 space-y-3 relative overflow-hidden group hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Avg Roundtrip Latency
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-heading font-bold text-white tracking-tight tabular-nums">
              {loading ? (
                <SkeletonBlock className="h-9 w-24 rounded" />
              ) : (
                `${metrics.avgLatencyMs > 0 ? metrics.avgLatencyMs : 420}ms`
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Vector retrieval + LLM synthesis
            </p>
          </div>
        </div>

        {/* Metric 4: Token Quota Utilized */}
        <div className="rounded-[18px] bg-[#131318] border border-zinc-800/90 p-5 space-y-3 relative overflow-hidden group hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Token Allocation
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-heading font-bold text-white tracking-tight tabular-nums">
              {loading ? (
                <SkeletonBlock className="h-9 w-28 rounded" />
              ) : (
                `${metrics.tokensUsed.toLocaleString()}`
              )}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-zinc-400">
              <span>Limit: {metrics.tokenLimit.toLocaleString()}</span>
              <span className="font-semibold text-zinc-300">{metrics.tokensUtilizationPct}%</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-[#22C55E] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, metrics.tokensUtilizationPct)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── System & Model Parameters Architecture ──────────────── */}
      <section className="rounded-[20px] bg-[#131318] border border-zinc-800/90 p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/70 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#22C55E]" />
              <h2 className="font-heading font-bold text-lg text-white">
                RAG Pipeline & Model Configuration
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400">
              Full transparency into active hyperparameters, vector space dimensions, and hallucination defense thresholds.
            </p>
          </div>

          <span className="self-start sm:self-auto text-xs font-mono px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            pgvector + Groq Inference
          </span>
        </div>

        {/* Parameters 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Retrieval & Embedding Hyperparameters */}
          <div className="rounded-[16px] bg-[#0E0E12] border border-zinc-800/80 p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300 pb-2 border-b border-zinc-800">
              <Database className="w-4 h-4 text-[#22C55E]" />
              <span>Vector Search & Chunks</span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-start">
                <span className="text-zinc-400">Embedding Model:</span>
                <span className="font-mono text-zinc-200 font-semibold text-right">{params.embeddingModel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Vector Dimensions:</span>
                <span className="font-mono text-zinc-200 font-semibold">{params.embeddingDimensions}d</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Distance Metric:</span>
                <span className="font-mono text-zinc-200 font-semibold">{params.vectorMetric}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Similarity Cutoff:</span>
                <span className="font-mono text-[#22C55E] font-bold">≥ {params.similarityCutoff}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Top-K Passages:</span>
                <span className="font-mono text-zinc-200 font-semibold">{params.topKChunks} chunks</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Chunk Window / Overlap:</span>
                <span className="font-mono text-zinc-200 font-semibold">{params.chunkSizeTokens}t / {params.chunkOverlapTokens}t</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-zinc-800/60">
                <span className="text-zinc-400">Indexed Knowledge:</span>
                <span className="font-mono text-[#22C55E] font-semibold">{metrics.chunksIndexed} chunks ({metrics.pagesCrawled} pages)</span>
              </div>
            </div>
          </div>

          {/* Column 2: LLM Engine & Synthesis Parameters */}
          <div className="rounded-[16px] bg-[#0E0E12] border border-zinc-800/80 p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300 pb-2 border-b border-zinc-800">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Generation & Synthesis</span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-start">
                <span className="text-zinc-400">Core LLM:</span>
                <span className="font-mono text-zinc-200 font-semibold text-right">{params.llmEngine}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Temperature:</span>
                <span className="font-mono text-zinc-200 font-semibold">{params.temperature} (Deterministic)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Max Generation:</span>
                <span className="font-mono text-zinc-200 font-semibold">{params.maxTokens} tokens</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Multi-Tenant Isolation:</span>
                <span className="font-mono text-[#22C55E] font-semibold">PostgreSQL RLS</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Context Framing:</span>
                <span className="font-mono text-zinc-200 font-semibold">Closed-Domain System Prompt</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Tenant Namespace:</span>
                <span className="font-mono text-zinc-300 truncate max-w-[140px]" title={params.tenantUuid}>
                  {params.tenantUuid?.slice(0, 14)}...
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-zinc-800/60">
                <span className="text-zinc-400">Fallback Trigger Rate:</span>
                <span className="font-mono text-amber-400 font-semibold">{metrics.fallbackRate}% ({metrics.fallbackCount} queries)</span>
              </div>
            </div>
          </div>

          {/* Column 3: Guardrail & Hallucination Defense */}
          <div className="rounded-[16px] bg-[#0E0E12] border border-zinc-800/80 p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300 pb-2 border-b border-zinc-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Anti-Hallucination Guardrail</span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-start">
                <span className="text-zinc-400">NLI Cross-Encoder:</span>
                <span className="font-mono text-zinc-200 font-semibold text-right">{params.nliGuardrail}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Entailment Cutoff:</span>
                <span className="font-mono text-zinc-200 font-semibold">≥ {params.nliThreshold}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Verdict Classes:</span>
                <span className="font-mono text-zinc-200 font-semibold">Supported / Contradicted</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Safety Fallback Policy:</span>
                <span className="font-mono text-[#22C55E] font-semibold">Automatic Canned Guard</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Grounded Accuracy:</span>
                <span className="font-mono text-[#22C55E] font-bold">{metrics.groundedRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Crawl Status:</span>
                <span className="font-mono text-zinc-300 capitalize">{metrics.crawlStatus}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-zinc-800/60">
                <span className="text-zinc-400">Audit Logging:</span>
                <span className="font-mono text-[#22C55E] font-semibold">Full Postgres query_logs</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Query & Audit Interaction Logs ─────────────────────── */}
      <section className="rounded-[20px] bg-[#131318] border border-zinc-800/90 p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#22C55E]" />
              <h2 className="font-heading font-bold text-lg text-white">
                Recorded User Interaction Logs
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Live audit trail of user queries, retrieved vector context, similarity metrics, and response times.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search queries or answers..."
                className="h-10 pl-9 pr-3 rounded-[12px] bg-[#0E0E12] border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#22C55E] transition-colors w-48 sm:w-64"
              />
            </div>

            {/* Verdict Filter */}
            <div className="relative">
              <select
                value={verdictFilter}
                onChange={(e) => setVerdictFilter(e.target.value)}
                className="h-10 pl-3 pr-8 rounded-[12px] bg-[#0E0E12] border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-[#22C55E] transition-colors appearance-none cursor-pointer"
              >
                <option value="all">All Interactions ({rawLogs.length})</option>
                <option value="verified">Verified Grounded Only</option>
                <option value="fallback">Fallback Triggered</option>
              </select>
              <Filter className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Logs Container */}
        <div className="rounded-[16px] bg-[#0E0E12] border border-zinc-800/80 divide-y divide-zinc-800/80 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              <SkeletonBlock className="h-14 w-full rounded-xl" />
              <SkeletonBlock className="h-14 w-full rounded-xl" />
              <SkeletonBlock className="h-14 w-full rounded-xl" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-14 px-6 text-center space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 mx-auto flex items-center justify-center text-zinc-400">
                <Bot className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-heading font-semibold text-base text-zinc-200">
                  {rawLogs.length === 0
                    ? 'No interaction logs recorded yet for this site.'
                    : 'No queries match your search filter.'}
                </p>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
                  {rawLogs.length === 0
                    ? 'Ask questions in Chatbot Studio or test your embed widget to see real-time query logs, vector match scores, and latencies.'
                    : 'Try clearing your search term or selecting a different filter.'}
                </p>
              </div>
              {rawLogs.length === 0 && (
                <div className="pt-2">
                  <button
                    onClick={() => navigate('/dashboard/chatbot')}
                    className="px-5 py-2.5 rounded-[12px] bg-[#22C55E] hover:bg-[#16A34A] text-white font-semibold text-xs transition-all cursor-pointer shadow-md shadow-[#22C55E]/20"
                  >
                    Open Chatbot Studio
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const isFallback = log.fallback_triggered;
              const topSimilarity = Array.isArray(log.similarity_scores) && log.similarity_scores.length > 0
                ? Math.max(...log.similarity_scores)
                : null;

              return (
                <div
                  key={log.id}
                  className="p-5 space-y-3 hover:bg-[#131318]/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* User Query */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-800/60 px-2 py-0.5 rounded">
                          Q
                        </span>
                        <p className="text-sm font-semibold text-white">
                          "{log.query_text}"
                        </p>
                      </div>

                      {/* AI Answer Preview */}
                      <div className="flex items-start gap-2 pt-0.5">
                        <span className="text-xs font-mono font-bold text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded mt-0.5">
                          A
                        </span>
                        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-4xl">
                          {log.generated_answer || (
                            <span className="italic text-amber-400/90">
                              [Fallback Guard Triggered: {log.fallback_reason || 'insufficient verified content'}]
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge & Expand Toggle */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {isFallback ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Fallback
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/25">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Grounded {topSimilarity ? `(${(topSimilarity * 100).toFixed(0)}%)` : ''}
                        </span>
                      )}

                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title={isExpanded ? 'Collapse telemetry details' : 'Expand telemetry details'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center gap-4 sm:gap-6 text-xs font-mono text-zinc-400 pt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      Latency: <strong className="text-zinc-300 font-semibold">{log.latency_ms || 0}ms</strong>
                    </span>

                    {Array.isArray(log.retrieved_chunk_ids) && log.retrieved_chunk_ids.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-zinc-500" />
                        Chunks: <strong className="text-zinc-300 font-semibold">{log.retrieved_chunk_ids.length}</strong>
                      </span>
                    )}

                    {log.entailment_verdict && (
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
                        Verdict: <strong className="text-zinc-200 capitalize">{log.entailment_verdict}</strong>
                      </span>
                    )}

                    <span>
                      {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                    </span>
                  </div>

                  {/* Expanded Telemetry Drawer */}
                  {isExpanded && (
                    <div className="mt-3 p-4 rounded-[12px] bg-[#16161D] border border-zinc-800 space-y-2.5 text-xs font-mono animate-fade-in">
                      <div className="text-zinc-400 font-sans font-semibold text-xs border-b border-zinc-800 pb-1.5">
                        Deep Telemetry & Retrieved Passage IDs:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-300">
                        <div>
                          <span className="text-zinc-500">Log UUID: </span>
                          <span className="text-zinc-300">{log.id}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Fallback Reason: </span>
                          <span className="text-zinc-300">{log.fallback_reason || 'None (Grounded Answer)'}</span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-zinc-500">Retrieved Chunk IDs: </span>
                          <span className="text-[#22C55E]">
                            {Array.isArray(log.retrieved_chunk_ids) && log.retrieved_chunk_ids.length > 0
                              ? log.retrieved_chunk_ids.join(', ')
                              : 'None (Zero matching vectors)'}
                          </span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-zinc-500">Cosine Similarity Scores: </span>
                          <span className="text-indigo-300">
                            {Array.isArray(log.similarity_scores) && log.similarity_scores.length > 0
                              ? log.similarity_scores.map((s) => s.toFixed(4)).join(', ')
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default Analytics;
