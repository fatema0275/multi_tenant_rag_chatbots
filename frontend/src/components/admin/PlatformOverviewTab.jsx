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
  Timer,
  Activity,
  UserPlus,
  Zap,
  ArrowUpRight
} from 'lucide-react';

const formatNumber = (num) => {
  if (num === undefined || num === null) return '0';
  return Number(num).toLocaleString();
};

const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl shadow-xl text-xs">
      <div className="font-semibold text-zinc-500 dark:text-zinc-400 mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: payload[0].color || payload[0].stroke || '#22C55E' }}
        />
        <span className="font-bold text-zinc-900 dark:text-white tabular-nums">
          {payload[0].value.toLocaleString()} {unit}
        </span>
      </div>
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, sub, colorClass = 'text-accent', bgClass = 'bg-accent/10', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay }}
    className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-4 rounded-[18px] flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-xs"
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-txt-secondary-light dark:text-txt-secondary-dark line-clamp-1">
        {label}
      </span>
      <div className={`w-8 h-8 rounded-xl ${bgClass} ${colorClass} flex items-center justify-center shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div className="mt-3">
      <div className="text-2xl font-heading font-extrabold text-zinc-900 dark:text-white tabular-nums tracking-tight">
        {value}
      </div>
      {sub && (
        <div className="text-[11px] font-medium text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
          {sub}
        </div>
      )}
    </div>
  </motion.div>
);

const ChartCard = ({ title, subtitle, data, dataKey, stroke = '#22C55E', fillGradientId = 'accentGrad', unit = '' }) => (
  <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-5 rounded-[20px] flex flex-col shadow-xs">
    <div className="mb-4">
      <h3 className="font-heading text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
        <span>{title}</span>
      </h3>
      <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
        {subtitle}
      </p>
    </div>
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={stroke} stopOpacity={0.3} />
              <stop offset="95%" stopColor={stroke} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: '#71717A' }}
            tickFormatter={(val) => {
              if (!val) return '';
              const parts = val.split('-');
              return `${parts[1]}/${parts[2]}`;
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: '#71717A' }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={stroke}
            strokeWidth={2.2}
            fillOpacity={1}
            fill={`url(#${fillGradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const EVENT_CONFIG = {
  new_user_registered: {
    label: 'User Registered',
    badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    icon: UserPlus
  },
  new_website_verified: {
    label: 'Website Verified',
    badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    icon: ShieldCheck
  },
  crawl_completed: {
    label: 'Crawl Completed',
    badge: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    icon: CheckCircle2
  },
  chatbot_generated: {
    label: 'Chatbot Generated',
    badge: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    icon: Bot
  },
  query_answered: {
    label: 'Query Answered',
    badge: 'bg-accent/10 text-accent border-accent/20',
    icon: Zap
  },
  query_fell_back: {
    label: 'Query Fell Back',
    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    icon: AlertTriangle
  }
};

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
        <SkeletonBlock className="h-72 rounded-2xl" />
      </div>
    );
  }

  const { metrics, charts, activity_feed } = data;

  return (
    <div className="space-y-8">
      {/* 10 Responsive Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <MetricCard
          icon={Users}
          label="Total Registered Users"
          value={formatNumber(metrics.total_users)}
          sub="Platform tenants"
          colorClass="text-blue-500"
          bgClass="bg-blue-500/10"
          delay={0.02}
        />
        <MetricCard
          icon={ShieldCheck}
          label="Total Verified Websites"
          value={formatNumber(metrics.total_verified_websites)}
          sub="DNS / Meta verified"
          colorClass="text-emerald-500"
          bgClass="bg-emerald-500/10"
          delay={0.04}
        />
        <MetricCard
          icon={Bot}
          label="Total Active Chatbots"
          value={formatNumber(metrics.total_active_chatbots)}
          sub="Serving live widgets"
          colorClass="text-purple-500"
          bgClass="bg-purple-500/10"
          delay={0.06}
        />
        <MetricCard
          icon={MessageSquare}
          label="Total Queries All Time"
          value={formatNumber(metrics.total_queries_all_time)}
          sub="Historical RAG queries"
          colorClass="text-accent"
          bgClass="bg-accent/10"
          delay={0.08}
        />
        <MetricCard
          icon={Clock}
          label="Total Queries Today"
          value={formatNumber(metrics.total_queries_today)}
          sub="Processed today"
          colorClass="text-amber-500"
          bgClass="bg-amber-500/10"
          delay={0.10}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Platform Fallback Rate"
          value={`${metrics.platform_fallback_rate}%`}
          sub="Queries that triggered fallback"
          colorClass="text-rose-500"
          bgClass="bg-rose-500/10"
          delay={0.12}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Verified Answer Rate"
          value={`${metrics.platform_verified_rate}%`}
          sub="NLI supported entailment"
          colorClass="text-emerald-400"
          bgClass="bg-emerald-500/10"
          delay={0.14}
        />
        <MetricCard
          icon={Layers}
          label="Indexed Chunks"
          value={formatNumber(metrics.total_chunks)}
          sub="Vector knowledge blocks"
          colorClass="text-cyan-500"
          bgClass="bg-cyan-500/10"
          delay={0.16}
        />
        <MetricCard
          icon={Globe}
          label="Total Pages Crawled"
          value={formatNumber(metrics.total_pages_crawled)}
          sub="Extracted web pages"
          colorClass="text-indigo-500"
          bgClass="bg-indigo-500/10"
          delay={0.18}
        />
        <MetricCard
          icon={Timer}
          label="Avg Response Time"
          value={`${metrics.avg_response_time_ms} ms`}
          sub="End-to-end latency"
          colorClass="text-violet-500"
          bgClass="bg-violet-500/10"
          delay={0.20}
        />
      </div>

      {/* Four Time-Series Line Charts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading text-lg font-bold text-zinc-900 dark:text-white">
              Platform Growth & Traffic Trends
            </h2>
            <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark">
              Daily telemetry metrics across all active tenants and visitor interactions.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-surface-dark border border-zinc-200 dark:border-border-dark text-txt-secondary-light dark:text-txt-secondary-dark">
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

      {/* Live Activity Feed */}
      <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark rounded-[22px] p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-accent animate-ping" />
            <div>
              <h3 className="font-heading text-base font-bold text-zinc-900 dark:text-white">
                Platform Live Activity Feed
              </h3>
              <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark">
                Last 20 operational events recorded platform-wide in reverse chronological order.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 rounded-full">
            REAL-TIME STREAM
          </span>
        </div>

        {(!activity_feed || activity_feed.length === 0) ? (
          <div className="p-8 text-center text-xs text-txt-secondary-light dark:text-txt-secondary-dark">
            No recent activity recorded.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 max-h-[460px] overflow-y-auto pr-1">
            {activity_feed.map((ev, idx) => {
              const cfg = EVENT_CONFIG[ev.event_type] || {
                label: ev.event_type,
                badge: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400',
                icon: Activity
              };
              const Icon = cfg.icon;
              return (
                <div
                  key={idx}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                          {ev.entity}
                        </span>
                      </div>
                      {ev.detail && (
                        <div className="text-[11px] text-txt-secondary-light dark:text-txt-secondary-dark truncate mt-0.5">
                          "{ev.detail}"
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-txt-secondary-light dark:text-txt-secondary-dark shrink-0">
                    {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformOverviewTab;
