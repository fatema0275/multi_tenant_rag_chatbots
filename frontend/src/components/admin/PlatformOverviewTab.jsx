import React from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import SkeletonBlock from '../ui/SkeletonBlock';
import {
  Users,
  ShieldCheck,
  Bot,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Globe,
  Timer
} from 'lucide-react';

const formatNumber = (num) => {
  if (num === undefined || num === null) return '0';
  return Number(num).toLocaleString();
};

const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#131318] border border-[#27272A] p-2.5 rounded-[10px] shadow-xl text-xs space-y-1 font-sans">
      <div className="font-semibold text-zinc-400">{label}</div>
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: payload[0].color || payload[0].stroke || '#22C55E' }}
        />
        <span className="font-semibold text-white tabular-nums">
          {payload[0].value?.toLocaleString()} {unit}
        </span>
      </div>
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, sub, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
    className="bg-[#131318] border border-[#27272A] p-4 rounded-[16px] flex flex-col justify-between hover:border-zinc-700 transition-colors"
  >
    <div className="flex items-center justify-between mb-3">
      <div className="w-8 h-8 rounded-[10px] bg-[#27272A] text-zinc-300 flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div>
      <div className="text-2xl font-bold tracking-tight text-white tabular-nums">
        {value}
      </div>
      <div className="text-xs font-semibold text-zinc-200 mt-1 line-clamp-1">
        {label}
      </div>
      {sub && (
        <div className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
          {sub}
        </div>
      )}
    </div>
  </motion.div>
);

const ChartCard = ({ title, subtitle, data, dataKey, stroke = '#22C55E', fillGradientId = 'accentGrad', unit = '' }) => (
  <div className="bg-[#131318] border border-[#27272A] p-5 rounded-[16px] flex flex-col">
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-white">
        {title}
      </h3>
      <p className="text-xs text-zinc-400 mt-0.5">
        {subtitle}
      </p>
    </div>
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data || []} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={stroke} stopOpacity={0.2} />
              <stop offset="95%" stopColor={stroke} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272A" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 9, fill: '#71717A' }}
            tickFormatter={(val) => {
              if (!val) return '';
              const parts = val.split('-');
              return `${parts[1]}/${parts[2]}`;
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 9, fill: '#71717A' }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={stroke}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#${fillGradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const PlatformOverviewTab = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const { metrics = {}, charts = {} } = data || {};

  return (
    <div className="space-y-6 font-sans">
      {/* 10 Responsive Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <MetricCard
          icon={Users}
          label="Total Registered Users"
          value={formatNumber(metrics.total_users)}
          sub="Platform tenants"
          delay={0.02}
        />
        <MetricCard
          icon={ShieldCheck}
          label="Total Verified Websites"
          value={formatNumber(metrics.total_verified_websites)}
          sub="DNS / Meta verified"
          delay={0.04}
        />
        <MetricCard
          icon={Bot}
          label="Total Active Chatbots"
          value={formatNumber(metrics.total_active_chatbots)}
          sub="Serving live widgets"
          delay={0.06}
        />
        <MetricCard
          icon={MessageSquare}
          label="Total Queries All Time"
          value={formatNumber(metrics.total_queries_all_time)}
          sub="Historical RAG queries"
          delay={0.08}
        />
        <MetricCard
          icon={Clock}
          label="Total Queries Today"
          value={formatNumber(metrics.total_queries_today)}
          sub="Processed today"
          delay={0.10}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Platform Fallback Rate"
          value={`${metrics.platform_fallback_rate ?? 0}%`}
          sub="Fallback triggered"
          delay={0.12}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Verified Answer Rate"
          value={`${metrics.platform_verified_rate ?? 0}%`}
          sub="Supported entailment"
          delay={0.14}
        />
        <MetricCard
          icon={Layers}
          label="Indexed Chunks"
          value={formatNumber(metrics.total_chunks)}
          sub="Vector knowledge blocks"
          delay={0.16}
        />
        <MetricCard
          icon={Globe}
          label="Total Pages Crawled"
          value={formatNumber(metrics.total_pages_crawled)}
          sub="Extracted web pages"
          delay={0.18}
        />
        <MetricCard
          icon={Timer}
          label="Avg Response Time"
          value={`${metrics.avg_response_time_ms ?? 0} ms`}
          sub="End-to-end latency"
          delay={0.20}
        />
      </div>

      {/* Four Time-Series Line Charts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Platform Growth & Traffic Trends
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Daily telemetry metrics across active tenants and user interactions.
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-[8px] bg-[#131318] border border-[#27272A] text-zinc-400">
            {charts.range?.toUpperCase() || '30D'} WINDOW
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard
            title="Daily Active Chatbots"
            subtitle="Unique tenant websites that received at least one query"
            data={charts.daily_active_chatbots}
            dataKey="count"
            stroke="#22C55E"
            fillGradientId="gradChatbots"
            unit="sites"
          />
          <ChartCard
            title="Daily Query Volume"
            subtitle="Total conversation questions submitted across all sites"
            data={charts.daily_query_volume}
            dataKey="count"
            stroke="#6366F1"
            fillGradientId="gradQueries"
            unit="queries"
          />
          <ChartCard
            title="Daily New User Registrations"
            subtitle="New tenant owner signups registered on SiteMind"
            data={charts.daily_new_users}
            dataKey="count"
            stroke="#3B82F6"
            fillGradientId="gradUsers"
            unit="users"
          />
          <ChartCard
            title="Daily New Website Registrations"
            subtitle="New domains submitted for verification and indexing"
            data={charts.daily_new_websites}
            dataKey="count"
            stroke="#EC4899"
            fillGradientId="gradWebsites"
            unit="websites"
          />
        </div>
      </div>
    </div>
  );
};

export default PlatformOverviewTab;
