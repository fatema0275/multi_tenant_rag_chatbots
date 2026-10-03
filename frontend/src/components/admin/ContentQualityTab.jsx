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
    <div className="bg-[#131318] border border-[#27272A] p-2.5 rounded-[12px] shadow-xl text-xs space-y-1">
      <div className="font-medium text-zinc-400">{label}</div>
      <div className="text-[#22C55E] font-semibold tabular-nums">
        {payload[0].value.toLocaleString()} Chunks
      </div>
      <div className="text-[11px] text-zinc-500">
        Optimal chunking target: 150 - 300 tokens
      </div>
    </div>
  );
};

const CustomSourcePieTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0];
  return (
    <div className="bg-[#131318] border border-[#27272A] p-2.5 rounded-[12px] shadow-xl text-xs">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.payload.color }} />
        <span className="font-semibold text-white">{d.name} Source</span>
      </div>
      <div className="mt-1 text-[11px] text-zinc-400">
        Indexed Pages: <strong className="text-white">{d.value}</strong> ({d.payload.percentage}%)
      </div>
    </div>
  );
};

const ContentQualityTab = ({ data, loading, onTriggerCrawl }) => {
  if (loading || !data) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-64 rounded-[16px]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonBlock className="h-64 rounded-[16px]" />
          <SkeletonBlock className="h-64 rounded-[16px]" />
        </div>
        <SkeletonBlock className="h-64 rounded-[16px]" />
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
    <div className="space-y-6">
      {/* 1. Platform-wide Content Gap Analysis */}
      <div className="bg-[#131318] border border-[#27272A] rounded-[16px] overflow-hidden">
        <div className="p-6 border-b border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Platform-Wide Content Gap Analysis
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Queries that returned <code className="text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-[4px]">insufficient_retrieval</code> fallback, clustered by topic across tenant sites.
            </p>
          </div>
          <span className="text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-[6px] shrink-0">
            {content_gaps.length} Gaps Detected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#27272A] bg-[#0E0E12] text-zinc-400 font-medium">
                <th className="py-3 px-5">Identified Knowledge Gap Topic</th>
                <th className="py-3 px-5">Unanswered Queries</th>
                <th className="py-3 px-5">Sites Affected</th>
                <th className="py-3 px-5">Sample Inquiries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]/50 text-zinc-300">
              {content_gaps.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-emerald-400 font-medium">
                    No persistent knowledge gaps detected across platform chatbots.
                  </td>
                </tr>
              ) : (
                content_gaps.map((gap, idx) => (
                  <tr key={idx} className="hover:bg-[#181820] transition-colors">
                    <td className="py-3.5 px-5 font-medium text-white flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{gap.topic}</span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="px-2 py-0.5 rounded-[6px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium tabular-nums">
                        {gap.query_count} queries
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-zinc-400">
                      {gap.distinct_sites_count} {gap.distinct_sites_count === 1 ? 'website' : 'websites'}
                    </td>
                    <td className="py-3.5 px-5 text-zinc-400 text-[11px]">
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
        <div className="bg-[#131318] border border-[#27272A] p-6 rounded-[16px] space-y-4">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Top Domains by Chunk Count (Well-Indexed)
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Sites with comprehensive vector coverage and rich indexing.
            </p>
          </div>

          <div className="divide-y divide-[#27272A]/50">
            {top_domains_highest_chunks.map((site, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-zinc-500 font-medium w-4">#{i + 1}</span>
                  <span className="font-medium text-white truncate max-w-[200px]">
                    {site.domain}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-400">{site.page_count} pages</span>
                  <span className="px-2 py-0.5 rounded-[6px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium tabular-nums">
                    {site.chunk_count?.toLocaleString()} chunks
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top domains with lowest chunk counts relative to page count */}
        <div className="bg-[#131318] border border-[#27272A] p-6 rounded-[16px] space-y-4">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Low Chunk-Density Domains (Needs Review)
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Lowest chunk-to-page density ratio. Often indicative of crawling/parsing skips.
            </p>
          </div>

          <div className="divide-y divide-[#27272A]/50">
            {top_domains_lowest_chunks_ratio.map((site, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <div className="font-medium text-white truncate max-w-[200px]">
                    {site.domain}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {site.chunk_count} chunks across {site.page_count} pages
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-[6px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium tabular-nums">
                    {site.ratio} chunks/page
                  </span>
                  {onTriggerCrawl && (
                    <button
                      onClick={() => onTriggerCrawl(site.id || site.domain)}
                      className="p-1.5 rounded-[8px] text-zinc-400 hover:text-white hover:bg-[#1C1C24] transition-colors cursor-pointer"
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
      <div className="bg-[#131318] border border-[#27272A] p-6 rounded-[16px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#22C55E]" />
              Histogram of Chunk Sizes (Token Distribution)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Verify chunking pipeline calibration. Optimal chunk size band is highlighted between 150-300 tokens.
            </p>
          </div>
          <span className="text-xs font-medium text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20 px-2.5 py-1 rounded-[6px]">
            Target: 150 - 300 Tokens
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chunk_size_histogram} margin={{ top: 8, right: 10, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272A" />
              <XAxis
                dataKey="range"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#71717A' }}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717A' }} />
              <Tooltip content={<CustomHistTooltip />} />
              <Bar
                dataKey="count"
                fill="#22C55E"
                radius={[4, 4, 0, 0]}
              >
                {chunk_size_histogram.map((entry, index) => {
                  const isOptimal = entry.range.includes('150') || entry.range.includes('200') || entry.range.includes('250');
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isOptimal ? '#22C55E' : '#3F3F46'}
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
        <div className="md:col-span-2 bg-[#131318] border border-[#27272A] p-6 rounded-[16px] space-y-4">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              Average Retrieval Similarity Score per Site
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Sites with consistently low similarity scores may have poor text extraction or multilingual mismatches.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#0E0E12] text-zinc-400 font-medium">
                  <th className="py-2.5 px-3">Domain</th>
                  <th className="py-2.5 px-3">Avg Similarity</th>
                  <th className="py-2.5 px-3">Query Samples</th>
                  <th className="py-2.5 px-3 text-right">Quality Assessment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]/50 text-zinc-300">
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
                      <tr key={idx} className="hover:bg-[#181820] transition-colors">
                        <td className="py-2.5 px-3 font-medium text-white">
                          {s.domain}
                        </td>
                        <td className="py-2.5 px-3 font-semibold tabular-nums">
                          <span className={isLow ? 'text-amber-400' : 'text-emerald-400'}>
                            {s.avg_similarity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-400 tabular-nums">
                          {s.query_count} queries
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`px-2 py-0.5 rounded-[6px] text-[11px] font-medium border ${
                            isLow
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
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
        <div className="bg-[#131318] border border-[#27272A] p-6 rounded-[16px] flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-400" />
              Source Type Breakdown
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5 mb-2">
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

          <div className="space-y-2 pt-3 border-t border-[#27272A]">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-zinc-300">{item.name}</span>
                </div>
                <span className="font-semibold text-white tabular-nums">
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
