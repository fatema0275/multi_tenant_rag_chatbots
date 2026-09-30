import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Cpu,
  Clock,
  RotateCw,
  Server,
  Zap,
  Globe
} from 'lucide-react';
import SkeletonBlock from '../ui/SkeletonBlock';

const MultiPercentileTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
      <div className="font-semibold text-zinc-500 dark:text-zinc-400">{label}</div>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{entry.name}:</span>
          </div>
          <span className="font-mono font-bold text-zinc-900 dark:text-white tabular-nums">
            {entry.value} ms
          </span>
        </div>
      ))}
    </div>
  );
};

const SystemPerformanceTab = ({ data, loading, onRetryCrawl }) => {
  if (loading || !data) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-32 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonBlock className="h-64 rounded-2xl" />
          <SkeletonBlock className="h-64 rounded-2xl" />
        </div>
        <SkeletonBlock className="h-64 rounded-2xl" />
      </div>
    );
  }

  const {
    status_summary = {},
    retrieval_latency = [],
    generation_latency = [],
    entailment_latency = [],
    groq_api_calls = [],
    crawl_success_rate = [],
    failed_crawls = []
  } = data;

  const status = status_summary.status || 'green';

  const bannerConfig = {
    green: {
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10 dark:bg-emerald-950/20',
      badge: 'bg-emerald-500 text-white',
      icon: CheckCircle2,
      textColor: 'text-emerald-500',
      title: 'Optimal Latency Status — All P90 Latencies Healthy',
    },
    yellow: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10 dark:bg-amber-950/20',
      badge: 'bg-amber-500 text-zinc-950',
      icon: AlertTriangle,
      textColor: 'text-amber-500',
      title: 'Warning — Moderate Latency Detected on P90',
    },
    red: {
      border: 'border-rose-500/30',
      bg: 'bg-rose-500/10 dark:bg-rose-950/20',
      badge: 'bg-rose-500 text-white',
      icon: AlertOctagon,
      textColor: 'text-rose-500',
      title: 'Critical Alert — P90 Latency Exceeds 6,000ms Threshold',
    },
  }[status] || {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    badge: 'bg-emerald-500 text-white',
    icon: CheckCircle2,
    textColor: 'text-emerald-500',
    title: 'Optimal Latency Status',
  };

  const StatusIcon = bannerConfig.icon;

  return (
    <div className="space-y-8">
      {/* Infrastructure Status Banner Card at Top */}
      <div className={`p-6 rounded-[22px] border ${bannerConfig.border} ${bannerConfig.bg} shadow-xs transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl ${bannerConfig.badge} flex items-center justify-center shrink-0 shadow-md`}>
            <StatusIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${bannerConfig.badge}`}>
                {status_summary.label || 'SYSTEM STATUS'}
              </span>
              <span className="text-xs font-mono text-zinc-500">Live Health SLA</span>
            </div>
            <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mt-1">
              {bannerConfig.title}
            </h2>
            <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5 max-w-xl">
              {status_summary.description || 'All P90 response latencies are measured end-to-end across the hybrid RAG query pipeline.'}
            </p>
          </div>
        </div>

        {/* P50 / P90 / P99 Summary Gauges */}
        <div className="flex items-center gap-4 bg-white/70 dark:bg-surface-dark/70 backdrop-blur-md p-3.5 rounded-2xl border border-zinc-200/50 dark:border-border-dark self-stretch md:self-auto justify-around">
          <div className="text-center px-3 border-r border-zinc-200 dark:border-border-dark">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Overall P50</div>
            <div className="text-lg font-heading font-extrabold text-zinc-900 dark:text-white tabular-nums mt-0.5">
              {status_summary.p50_ms || 0} <span className="text-xs font-normal text-zinc-400">ms</span>
            </div>
          </div>
          <div className="text-center px-3 border-r border-zinc-200 dark:border-border-dark">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Overall P90</div>
            <div className={`text-lg font-heading font-extrabold tabular-nums mt-0.5 ${bannerConfig.textColor}`}>
              {status_summary.p90_ms || 0} <span className="text-xs font-normal text-zinc-400">ms</span>
            </div>
          </div>
          <div className="text-center px-3">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Overall P99</div>
            <div className="text-lg font-heading font-extrabold text-zinc-900 dark:text-white tabular-nums mt-0.5">
              {status_summary.p99_ms || 0} <span className="text-xs font-normal text-zinc-400">ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Latency Breakdown Across RAG Pipeline: 3 Line Charts */}
      <div>
        <div className="mb-4">
          <h3 className="font-heading text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-accent" />
            RAG Pipeline Latency Breakdown (P50 / P90 / P99)
          </h3>
          <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
            Granular percentile curves across Hybrid Vector Retrieval, Groq Generation, and NLI Entailment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Retrieval Latency */}
          <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-5 rounded-[22px] shadow-xs">
            <div className="mb-3">
              <h4 className="font-heading text-xs font-bold text-zinc-900 dark:text-white">
                1. Vector & Hybrid Retrieval Time
              </h4>
              <p className="text-[11px] text-zinc-400">pgvector cosine & hybrid scan</p>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={retrieval_latency} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717A' }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717A' }} />
                  <Tooltip content={<MultiPercentileTooltip />} />
                  <Line type="monotone" dataKey="P50" name="P50" stroke="#22C55E" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="P90" name="P90" stroke="#F59E0B" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="P99" name="P99" stroke="#EF4444" strokeWidth={1.8} strokeDasharray="3 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 text-[10px] font-mono text-zinc-400 pt-2 border-t border-zinc-100 dark:border-border-dark">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#22C55E]" /> P50</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> P90</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#EF4444]" /> P99</span>
            </div>
          </div>

          {/* 2. Generation Latency */}
          <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-5 rounded-[22px] shadow-xs">
            <div className="mb-3">
              <h4 className="font-heading text-xs font-bold text-zinc-900 dark:text-white">
                2. Groq Generation Time
              </h4>
              <p className="text-[11px] text-zinc-400">LLaMA 3.3 70B inference latency</p>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={generation_latency} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717A' }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717A' }} />
                  <Tooltip content={<MultiPercentileTooltip />} />
                  <Line type="monotone" dataKey="P50" name="P50" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="P90" name="P90" stroke="#F59E0B" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="P99" name="P99" stroke="#EF4444" strokeWidth={1.8} strokeDasharray="3 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 text-[10px] font-mono text-zinc-400 pt-2 border-t border-zinc-100 dark:border-border-dark">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3B82F6]" /> P50</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> P90</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#EF4444]" /> P99</span>
            </div>
          </div>

          {/* 3. Entailment Latency */}
          <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-5 rounded-[22px] shadow-xs">
            <div className="mb-3">
              <h4 className="font-heading text-xs font-bold text-zinc-900 dark:text-white">
                3. NLI Entailment Verification Time
              </h4>
              <p className="text-[11px] text-zinc-400">Cross-encoder claim verification</p>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={entailment_latency} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717A' }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717A' }} />
                  <Tooltip content={<MultiPercentileTooltip />} />
                  <Line type="monotone" dataKey="P50" name="P50" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="P90" name="P90" stroke="#F59E0B" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="P99" name="P99" stroke="#EF4444" strokeWidth={1.8} strokeDasharray="3 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 text-[10px] font-mono text-zinc-400 pt-2 border-t border-zinc-100 dark:border-border-dark">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#8B5CF6]" /> P50</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> P90</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#EF4444]" /> P99</span>
            </div>
          </div>
        </div>
      </div>

      {/* Groq API Rate Limits & Crawl Job Success Rate Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Groq API Calls & Rate Limits */}
        <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-6 rounded-[22px] shadow-xs">
          <div className="mb-4">
            <h3 className="font-heading text-sm font-bold text-zinc-900 dark:text-white flex items-center justify-between">
              <span>Groq API Traffic & Rate Limits Hit</span>
              <span className="text-[10px] font-mono text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">
                fallback_reason = 'groq_rate_limit'
              </span>
            </h3>
            <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
              Total LLM generation calls versus 429 rate limit triggers.
            </p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groq_api_calls} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717A' }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717A' }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    return (
                      <div className="bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                        <div className="font-semibold text-zinc-400">{label}</div>
                        <div className="text-indigo-400 font-bold">Total Calls: {payload[0].value}</div>
                        <div className="text-rose-500 font-bold">Rate Limits Hit: {payload[1].value}</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="total_calls" name="Total Calls" fill="#6366F1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rate_limits" name="Rate Limits" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-zinc-500 pt-2 border-t border-zinc-100 dark:border-border-dark">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#6366F1]" /> Total Groq Calls</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Rate Limits Hit</span>
          </div>
        </div>

        {/* Crawl Job Success Rate */}
        <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-6 rounded-[22px] shadow-xs">
          <div className="mb-4">
            <h3 className="font-heading text-sm font-bold text-zinc-900 dark:text-white">
              Crawl Job Success Rate (%)
            </h3>
            <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
              Daily ratio of completed crawl jobs vs total started.
            </p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={crawl_success_rate} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717A' }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717A' }} domain={[0, 100]} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                        <div className="font-semibold text-zinc-400">{label}</div>
                        <div className="text-emerald-400 font-bold">Success Rate: {d.success_rate}%</div>
                        <div className="text-zinc-500">Completed: {d.completed} / Started: {d.total_started}</div>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="success_rate" stroke="#22C55E" strokeWidth={2.4} dot={{ r: 3, fill: '#22C55E' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-zinc-500 pt-2 border-t border-zinc-100 dark:border-border-dark">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" /> Success Rate (100% Target)</span>
          </div>
        </div>
      </div>

      {/* Failed Crawl Jobs List */}
      <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark rounded-[22px] overflow-hidden shadow-xs">
        <div className="p-5 border-b border-zinc-200/80 dark:border-border-dark flex items-center justify-between">
          <div>
            <h3 className="font-heading text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Failed Crawl Jobs Inspection
            </h3>
            <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
              Crawl failures that require domain configuration or retry attention.
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-rose-500/10 text-rose-500 px-2.5 py-1 rounded-full">
            {failed_crawls.length} FAILED JOBS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200/80 dark:border-border-dark bg-zinc-50/75 dark:bg-surface-dark/75 text-txt-secondary-light dark:text-txt-secondary-dark">
                <th className="py-3 px-4 font-bold">Domain</th>
                <th className="py-3 px-4 font-bold">Error Reason</th>
                <th className="py-3 px-4 font-bold">Pages Attempted</th>
                <th className="py-3 px-4 font-bold">Timestamp</th>
                <th className="py-3 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {failed_crawls.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-emerald-500 font-semibold">
                    🎉 No failed crawl jobs recorded! All scans completed successfully.
                  </td>
                </tr>
              ) : (
                failed_crawls.map((job) => (
                  <tr key={job.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>{job.domain}</span>
                    </td>
                    <td className="py-3.5 px-4 text-rose-500 font-mono text-[11px] max-w-[340px] truncate">
                      {job.error_reason}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      Crawled: {job.pages_crawled} / Failed: {job.pages_failed}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">
                      {job.timestamp ? new Date(job.timestamp).toLocaleString() : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {onRetryCrawl && (
                        <button
                          onClick={() => onRetryCrawl(job.domain)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-accent/15 hover:text-accent text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Retry Crawl
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SystemPerformanceTab;
