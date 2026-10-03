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
  CartesianGrid
} from 'recharts';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Globe
} from 'lucide-react';
import SkeletonBlock from '../ui/SkeletonBlock';

const MultiPercentileTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#131318] border border-[#27272A] p-3 rounded-[12px] shadow-xl text-xs space-y-1.5 font-sans">
      <div className="font-semibold text-zinc-400">{label}</div>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="font-medium text-zinc-300">{entry.name}:</span>
          </div>
          <span className="font-semibold text-white tabular-nums">
            {entry.value?.toLocaleString()} ms
          </span>
        </div>
      ))}
    </div>
  );
};

const SystemPerformanceTab = ({ data, loading, onRetryCrawl }) => {
  if (loading || !data) {
    return (
      <div className="space-y-6 font-sans">
        <SkeletonBlock className="h-32 rounded-[16px]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-64 rounded-[16px]" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonBlock className="h-64 rounded-[16px]" />
          <SkeletonBlock className="h-64 rounded-[16px]" />
        </div>
        <SkeletonBlock className="h-64 rounded-[16px]" />
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

  const statusMeta = {
    green: {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      dot: 'bg-emerald-400',
      label: 'Optimal Health',
      title: 'P90 latency within normal operating limits (<3,000 ms)',
      color: 'text-emerald-400'
    },
    yellow: {
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      dot: 'bg-amber-400',
      label: 'Moderate Latency',
      title: 'P90 latency elevated between 3,000 ms and 6,000 ms',
      color: 'text-amber-400'
    },
    red: {
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      dot: 'bg-rose-400',
      label: 'Elevated Latency',
      title: 'P90 latency exceeds 6,000 ms SLA threshold',
      color: 'text-rose-400'
    },
  }[status] || {
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-400',
    label: 'Optimal Health',
    title: 'P90 latency within normal limits',
    color: 'text-emerald-400'
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Infrastructure SLA Status Card */}
      <div className="p-6 rounded-[16px] bg-[#131318] border border-[#27272A] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusMeta.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
              {statusMeta.label}
            </span>
            <span className="text-xs text-zinc-500">Service Level Agreement</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight mt-2">
            {statusMeta.title}
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            {status_summary.description || 'Latency percentiles measured end-to-end across vector retrieval, LLM generation, and NLI verification.'}
          </p>
        </div>

        {/* P50 / P90 / P99 Metric Tiles */}
        <div className="grid grid-cols-3 gap-3 self-stretch lg:self-auto">
          <div className="bg-[#09090B] border border-[#27272A] p-3.5 rounded-[12px] text-center min-w-[105px]">
            <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Overall P50</div>
            <div className="text-xl font-bold text-white tabular-nums mt-1">
              {status_summary.p50_ms ?? 0} <span className="text-xs font-normal text-zinc-500">ms</span>
            </div>
          </div>
          <div className="bg-[#09090B] border border-[#27272A] p-3.5 rounded-[12px] text-center min-w-[105px]">
            <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Overall P90</div>
            <div className={`text-xl font-bold tabular-nums mt-1 ${statusMeta.color}`}>
              {status_summary.p90_ms ?? 0} <span className="text-xs font-normal text-zinc-500">ms</span>
            </div>
          </div>
          <div className="bg-[#09090B] border border-[#27272A] p-3.5 rounded-[12px] text-center min-w-[105px]">
            <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Overall P99</div>
            <div className="text-xl font-bold text-white tabular-nums mt-1">
              {status_summary.p99_ms ?? 0} <span className="text-xs font-normal text-zinc-500">ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Latency Breakdown Across RAG Pipeline: 3 Line Charts */}
      <div>
        <div className="mb-3">
          <h3 className="text-base font-bold text-white tracking-tight">
            Pipeline Stage Latencies
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Historical P50, P90, and P99 percentiles across Hybrid Vector Retrieval, Groq Generation, and NLI Entailment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Retrieval Latency */}
          <div className="bg-[#131318] border border-[#27272A] p-5 rounded-[16px] flex flex-col justify-between">
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-white">
                1. Vector & Hybrid Retrieval
              </h4>
              <p className="text-[11px] text-zinc-500">pgvector embedding search</p>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={retrieval_latency} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272A" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717A' }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717A' }} />
                  <Tooltip content={<MultiPercentileTooltip />} />
                  <Line type="monotone" dataKey="P50" name="P50" stroke="#22C55E" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="P90" name="P90" stroke="#F59E0B" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="P99" name="P99" stroke="#EF4444" strokeWidth={1.8} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 text-[11px] text-zinc-400 pt-3 border-t border-[#27272A]/50">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#22C55E]" /> P50</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> P90</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#EF4444]" /> P99</span>
            </div>
          </div>

          {/* 2. Generation Latency */}
          <div className="bg-[#131318] border border-[#27272A] p-5 rounded-[16px] flex flex-col justify-between">
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-white">
                2. Groq LLM Inference
              </h4>
              <p className="text-[11px] text-zinc-500">LLaMA 3.3 70B generation time</p>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={generation_latency} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272A" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717A' }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717A' }} />
                  <Tooltip content={<MultiPercentileTooltip />} />
                  <Line type="monotone" dataKey="P50" name="P50" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="P90" name="P90" stroke="#F59E0B" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="P99" name="P99" stroke="#EF4444" strokeWidth={1.8} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 text-[11px] text-zinc-400 pt-3 border-t border-[#27272A]/50">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#3B82F6]" /> P50</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> P90</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#EF4444]" /> P99</span>
            </div>
          </div>

          {/* 3. Entailment Latency */}
          <div className="bg-[#131318] border border-[#27272A] p-5 rounded-[16px] flex flex-col justify-between">
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-white">
                3. Entailment Verification
              </h4>
              <p className="text-[11px] text-zinc-500">Cross-encoder claim validation</p>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={entailment_latency} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272A" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717A' }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717A' }} />
                  <Tooltip content={<MultiPercentileTooltip />} />
                  <Line type="monotone" dataKey="P50" name="P50" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="P90" name="P90" stroke="#F59E0B" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="P99" name="P99" stroke="#EF4444" strokeWidth={1.8} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 text-[11px] text-zinc-400 pt-3 border-t border-[#27272A]/50">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#8B5CF6]" /> P50</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> P90</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#EF4444]" /> P99</span>
            </div>
          </div>
        </div>
      </div>

      {/* Groq API Rate Limits & Crawl Job Success Rate Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Groq API Calls & Rate Limits */}
        <div className="bg-[#131318] border border-[#27272A] p-5 rounded-[16px] flex flex-col justify-between">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-white">
              Groq API Traffic & Rate Limits
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              LLM inference requests versus 429 rate limit events.
            </p>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groq_api_calls} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272A" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717A' }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717A' }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    return (
                      <div className="bg-[#131318] border border-[#27272A] p-2.5 rounded-[10px] shadow-xl text-xs space-y-1 font-sans">
                        <div className="font-semibold text-zinc-400">{label}</div>
                        <div className="text-indigo-400 font-medium">Total Calls: {payload[0]?.value ?? 0}</div>
                        <div className="text-rose-400 font-medium">Rate Limits: {payload[1]?.value ?? 0}</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="total_calls" name="Total Calls" fill="#6366F1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="rate_limits" name="Rate Limits" fill="#EF4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-zinc-400 pt-3 border-t border-[#27272A]/50">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#6366F1]" /> Total Groq Calls</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Rate Limits</span>
          </div>
        </div>

        {/* Crawl Job Success Rate */}
        <div className="bg-[#131318] border border-[#27272A] p-5 rounded-[16px] flex flex-col justify-between">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-white">
              Crawl Job Success Rate (%)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Ratio of completed web crawler jobs to total started.
            </p>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={crawl_success_rate} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272A" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717A' }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#71717A' }} domain={[0, 100]} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#131318] border border-[#27272A] p-2.5 rounded-[10px] shadow-xl text-xs space-y-1 font-sans">
                        <div className="font-semibold text-zinc-400">{label}</div>
                        <div className="text-emerald-400 font-medium">Success Rate: {d.success_rate}%</div>
                        <div className="text-zinc-500">Completed: {d.completed} / Started: {d.total_started}</div>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="success_rate" stroke="#22C55E" strokeWidth={2} dot={{ r: 2.5, fill: '#22C55E' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-zinc-400 pt-3 border-t border-[#27272A]/50">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#22C55E]" /> Success Rate</span>
          </div>
        </div>
      </div>

      {/* Failed Crawl Jobs List */}
      <div className="bg-[#131318] border border-[#27272A] rounded-[16px] overflow-hidden">
        <div className="p-5 border-b border-[#27272A] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Crawl Job Exceptions
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Crawl executions that encountered DNS, timeout, or parsing errors.
            </p>
          </div>
          <span className="text-xs font-medium bg-[#27272A] text-zinc-300 px-2.5 py-1 rounded-[8px]">
            {failed_crawls.length} {failed_crawls.length === 1 ? 'Failed Job' : 'Failed Jobs'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#27272A] bg-[#0E0E12] text-zinc-400">
                <th className="py-3 px-4 font-medium">Domain</th>
                <th className="py-3 px-4 font-medium">Reason</th>
                <th className="py-3 px-4 font-medium">Pages</th>
                <th className="py-3 px-4 font-medium">Date</th>
                <th className="py-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]/60">
              {failed_crawls.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-zinc-500 font-medium">
                    No failed crawl jobs recorded. All crawler executions completed successfully.
                  </td>
                </tr>
              ) : (
                failed_crawls.map((job) => (
                  <tr key={job.id} className="hover:bg-[#181820] transition-colors">
                    <td className="py-3 px-4 font-medium text-white flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>{job.domain}</span>
                    </td>
                    <td className="py-3 px-4 text-rose-400 text-xs max-w-[340px] truncate">
                      {job.error_reason}
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      {job.pages_crawled} crawled, {job.pages_failed} failed
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {job.timestamp ? new Date(job.timestamp).toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {onRetryCrawl && (
                        <button
                          onClick={() => onRetryCrawl(job.domain)}
                          className="px-2.5 py-1 rounded-[6px] bg-[#27272A] hover:bg-[#323238] text-white text-[11px] font-medium transition-colors cursor-pointer"
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
