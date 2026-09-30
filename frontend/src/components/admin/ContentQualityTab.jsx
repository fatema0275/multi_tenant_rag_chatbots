import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  BookOpen,
  Layers,
  AlertTriangle,
  RotateCw,
  Globe,
  FileText,
  PieChart as PieIcon,
  HelpCircle,
  Sparkles,
  BarChart2
} from 'lucide-react';
import SkeletonBlock from '../ui/SkeletonBlock';

const SOURCE_COLORS = {
  HTML: '#3B82F6',       // Blue
  PDF: '#EF4444',        // Red
  DOCX: '#22C55E',       // Green
  'image-ocr': '#F59E0B' // Amber
};

const CustomHistTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
      <div className="font-semibold text-zinc-400">{label}</div>
      <div className="text-accent font-bold tabular-nums">
        {payload[0].value.toLocaleString()} Chunks
      </div>
      <div className="text-[10px] text-zinc-500">
        Optimal chunking target: 150 - 300 tokens
      </div>
    </div>
  );
};

const CustomSourcePieTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl shadow-xl text-xs">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.payload.color }} />
        <span className="font-bold text-zinc-900 dark:text-white">{d.name} Source</span>
      </div>
      <div className="mt-1 font-mono text-[11px] text-zinc-500">
        Indexed Pages: <strong className="text-zinc-900 dark:text-white">{d.value}</strong> ({d.payload.percentage}%)
      </div>
    </div>
  );
};

const ContentQualityTab = ({ data, loading, onTriggerCrawl }) => {
  if (loading || !data) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-64 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonBlock className="h-64 rounded-2xl" />
          <SkeletonBlock className="h-64 rounded-2xl" />
        </div>
        <SkeletonBlock className="h-64 rounded-2xl" />
      </div>
    );
  }

  const {
    content_gaps = [],
    top_domains_highest_chunks = [],
    top_domains_lowest_chunks_ratio = [],
    chunk_size_histogram = [],
    domain_similarity_scores = [],
    source_type_breakdown = []
  } = data;

  const pieData = source_type_breakdown.map((s) => ({
    name: s.name,
    value: s.value,
    percentage: s.percentage,
    color: SOURCE_COLORS[s.name] || '#6366F1'
  }));

  return (
    <div className="space-y-8">
      {/* 1. Platform-wide Content Gap Analysis */}
      <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark rounded-[22px] overflow-hidden shadow-xs">
        <div className="p-6 border-b border-zinc-200/80 dark:border-border-dark flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <h3 className="font-heading text-base font-bold text-zinc-900 dark:text-white">
                Platform-Wide Content Gap Analysis
              </h3>
            </div>
            <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
              Queries that returned <code className="text-rose-500 bg-rose-500/10 px-1 py-0.5 rounded font-mono">insufficient_retrieval</code> fallback, clustered by topic across different tenant sites.
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full shrink-0">
            {content_gaps.length} GAPS DETECTED
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200/80 dark:border-border-dark bg-zinc-50/75 dark:bg-surface-dark/75 text-txt-secondary-light dark:text-txt-secondary-dark">
                <th className="py-3 px-5 font-bold">Identified Knowledge Gap Topic</th>
                <th className="py-3 px-5 font-bold">Unanswered Query Count</th>
                <th className="py-3 px-5 font-bold">Distinct Sites Affected</th>
                <th className="py-3 px-5 font-bold">Sample Unanswered Inquiries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {content_gaps.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-emerald-500 font-semibold">
                    🎉 Excellent! No persistent knowledge gaps detected across platform chatbots.
                  </td>
                </tr>
              ) : (
                content_gaps.map((gap, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{gap.topic}</span>
                    </td>
                    <td className="py-3.5 px-5 font-mono">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-bold">
                        {gap.query_count} queries
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-zinc-700 dark:text-zinc-300">
                      {gap.distinct_sites_count} {gap.distinct_sites_count === 1 ? 'website' : 'websites'}
                    </td>
                    <td className="py-3.5 px-5 text-txt-secondary-light dark:text-txt-secondary-dark text-[11px]">
                      <div className="space-y-0.5">
                        {gap.sample_queries?.slice(0, 2).map((sq, i) => (
                          <div key={i} className="truncate max-w-sm">
                            • "{sq}"
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Top Domains Highest Chunks vs Lowest Chunk-to-Page Ratio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top domains with highest chunk counts */}
        <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-6 rounded-[22px] shadow-xs space-y-4">
          <div>
            <h4 className="font-heading text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              Top Domains by Chunk Count (Well-Indexed)
            </h4>
            <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
              Sites with comprehensive vector coverage and rich indexing.
            </p>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {top_domains_highest_chunks.map((site, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="font-mono text-zinc-400 font-bold w-4">#{i + 1}</span>
                  <span className="font-bold text-zinc-900 dark:text-white truncate max-w-[200px]">
                    {site.domain}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-400 font-mono">{site.page_count} pages</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold font-mono">
                    {site.chunk_count?.toLocaleString()} chunks
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top domains with lowest chunk counts relative to page count */}
        <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-6 rounded-[22px] shadow-xs space-y-4">
          <div>
            <h4 className="font-heading text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Poorly Chunked Domains (Needs Re-Crawl)
            </h4>
            <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
              Lowest chunk-to-page density ratio. Often indicative of crawling/parsing skips.
            </p>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {top_domains_lowest_chunks_ratio.map((site, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <div className="font-bold text-zinc-900 dark:text-white truncate max-w-[200px]">
                    {site.domain}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {site.chunk_count} chunks across {site.page_count} pages
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-bold font-mono">
                    {site.ratio} chunks/page
                  </span>
                  {onTriggerCrawl && (
                    <button
                      onClick={() => onTriggerCrawl(site.id || site.domain)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-accent hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      title="Re-crawl site"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Chunk Size Histogram across all document_chunks */}
      <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-6 rounded-[22px] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-heading text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-accent" />
              Histogram of Chunk Sizes (Token Distribution)
            </h3>
            <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
              Verify chunking pipeline calibration. Optimal chunk size band is highlighted between 150-300 tokens.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-full">
            TARGET: 150 - 300 TOKENS
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chunk_size_histogram} margin={{ top: 8, right: 10, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
              <XAxis
                dataKey="range"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#71717A' }}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#71717A' }} />
              <Tooltip content={<CustomHistTooltip />} />
              <Bar
                dataKey="count"
                fill="#22C55E"
                radius={[6, 6, 0, 0]}
              >
                {chunk_size_histogram.map((entry, index) => {
                  const isOptimal = entry.range.includes('150') || entry.range.includes('200') || entry.range.includes('250');
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isOptimal ? '#22C55E' : '#64748B'}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Similarity Scores per Site & Source Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Average Similarity Score per Site */}
        <div className="md:col-span-2 bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-6 rounded-[22px] shadow-xs space-y-4">
          <div>
            <h4 className="font-heading text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-500" />
              Average Retrieval Similarity Score per Site
            </h4>
            <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
              Sites with consistently low similarity scores may have poor text extraction or multilingual mismatches.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-border-dark text-txt-secondary-light dark:text-txt-secondary-dark">
                  <th className="py-2.5 px-3 font-bold">Domain</th>
                  <th className="py-2.5 px-3 font-bold">Avg Similarity Score</th>
                  <th className="py-2.5 px-3 font-bold">Query Samples</th>
                  <th className="py-2.5 px-3 font-bold text-right">Quality Assessment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {domain_similarity_scores.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-zinc-500">
                      No query similarity logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  domain_similarity_scores.map((s, idx) => {
                    const isLow = s.avg_similarity < 0.55;
                    return (
                      <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                        <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-white">
                          {s.domain}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">
                          <span className={isLow ? 'text-amber-500' : 'text-emerald-500'}>
                            {s.avg_similarity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-zinc-500">
                          {s.query_count} queries
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isLow
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            {isLow ? 'Low Alignment' : 'High Alignment'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Source Type Breakdown Pie Chart */}
        <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-6 rounded-[22px] shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="font-heading text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-500" />
              Source Type Breakdown
            </h4>
            <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5 mb-2">
              Indexed content format distribution (PDF, HTML, DOCX, Image OCR).
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
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomSourcePieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

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
    </div>
  );
};

export default ContentQualityTab;
