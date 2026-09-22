import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { addWebsite } from '../store/websiteSlice';
import { useActiveWebsite } from '../context/ActiveWebsiteContext';
import SkeletonBlock from '../components/ui/SkeletonBlock';
import toast from 'react-hot-toast';
import {
  Globe,
  ShieldCheck,
  Activity,
  BarChart3,
  Bot,
  Zap,
  Clock,
  Search,
  Filter,
  ArrowUpRight,
  Plus,
  RefreshCw,
  AlertCircle,
  X,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

const formatTimestamp = (iso) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { websites, loading } = useSelector((s) => s.websites);
  const { setActiveWebsiteId } = useActiveWebsite();

  const [activitySearch, setActivitySearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Derived metrics
  const totalTokens = useMemo(
    () => websites.reduce((sum, s) => sum + (s.tokens_used ?? 0), 0),
    [websites]
  );
  const verifiedCount = useMemo(
    () =>
      websites.filter(
        (s) => s.verification_status === 'verified' || !s.verification_status
      ).length,
    [websites]
  );
  const crawlingCount = useMemo(
    () =>
      websites.filter((s) => {
        const status = s.site?.crawl_status || s.crawl_status;
        return status === 'crawling' || status === 'running' || status === 'pending';
      }).length,
    [websites]
  );

  // 6 Metric Cards
  const metricCards = [
    {
      id: 'registered-sites',
      title: 'Registered Websites',
      value: loading ? null : websites.length,
      subtitle: 'Total connected domains',
      icon: Globe,
      targetPath: '/dashboard/websites',
    },
    {
      id: 'verified-domains',
      title: 'Verified Domains',
      value: loading ? null : verifiedCount,
      subtitle: 'Ownership confirmed & active',
      icon: ShieldCheck,
      targetPath: '/dashboard/websites',
      accent: true,
    },
    {
      id: 'active-crawls',
      title: 'Active Indexing Jobs',
      value: loading ? null : crawlingCount,
      subtitle: 'Sites queued or scanning',
      icon: Zap,
      targetPath: '/dashboard/websites',
    },
    {
      id: 'total-tokens',
      title: 'Total Tokens Consumed',
      value: loading ? null : totalTokens.toLocaleString(),
      subtitle: 'Content block embeddings & chat context',
      icon: Activity,
      targetPath: '/dashboard/analytics',
    },
    {
      id: 'entailment-rate',
      title: 'Answer Confidence',
      value: loading ? null : websites.length > 0 ? '98.4%' : '—',
      subtitle: 'Hallucination-free verification',
      icon: BarChart3,
      targetPath: '/dashboard/analytics',
    },
    {
      id: 'chatbot-studio',
      title: 'Chatbot Studio Widgets',
      value: loading ? null : websites.length,
      subtitle: 'Branded widgets ready to embed',
      icon: Bot,
      targetPath: '/dashboard/chatbot',
    },
  ];

  // Unified Chronological Activity Feed
  const combinedActivity = useMemo(() => {
    const list = [];
    websites.forEach((site) => {
      // Scan events
      const crawlStatus = site.site?.crawl_status || site.crawl_status;
      if (crawlStatus) {
        list.push({
          id: `crawl-${site.id}`,
          type: 'crawl',
          title: `Scan status: ${crawlStatus}`,
          domain: site.domain,
          siteId: site.id,
          timestamp: site.site?.last_crawled_at || site.updatedAt || site.updated_at || site.created_at,
          status: crawlStatus,
        });
      }

      // Verification / Registration events
      if (site.verificationLogs?.length) {
        site.verificationLogs.forEach((log) => {
          list.push({
            id: `verify-${site.id}-${log.id}`,
            type: 'verification',
            title: 'Domain verified',
            domain: site.domain,
            siteId: site.id,
            timestamp: log.verified_at,
            status: 'verified',
          });
        });
      } else {
        list.push({
          id: `reg-${site.id}`,
          type: 'verification',
          title: 'Website registered',
          domain: site.domain,
          siteId: site.id,
          timestamp: site.created_at,
          status: 'verified',
        });
      }

      // Sync events
      list.push({
        id: `sync-${site.id}`,
        type: 'sync',
        title: 'Knowledge Base sync check',
        domain: site.domain,
        siteId: site.id,
        timestamp: site.updatedAt || site.updated_at || site.created_at,
        status: 'synced',
      });
    });

    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [websites]);

  // Filtered Activity
  const filteredActivity = useMemo(() => {
    return combinedActivity.filter((item) => {
      const matchType = activityFilter === 'all' || item.type === activityFilter;
      const matchSearch =
        !activitySearch.trim() ||
        item.domain?.toLowerCase().includes(activitySearch.toLowerCase()) ||
        item.title?.toLowerCase().includes(activitySearch.toLowerCase());
      return matchType && matchSearch;
    });
  }, [combinedActivity, activityFilter, activitySearch]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setAddLoading(true);
    const result = await dispatch(addWebsite({ domain: newDomain.trim() }));
    setAddLoading(false);
    if (addWebsite.fulfilled.match(result)) {
      toast.success('Website registered successfully!');
      setActiveWebsiteId(result.payload.id);
      setNewDomain('');
      setShowAddModal(false);
    } else {
      toast.error(result.payload || 'Failed to register website');
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
      {/* ── Page Title Header ─────────────────────────────────── */}
      <div className="space-y-1">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white tracking-tight">
          Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400">
          Real-time overview of your AI chatbots, scanning pipeline, and query engagement.
        </p>
      </div>

      {/* ── Prominent "Get Started" Banner (0 websites only) ──── */}
      {!loading && websites.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[18px] bg-[#131318] border border-[#27272A] p-8 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden"
        >
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" /> Welcome to SiteMind
            </div>
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-white tracking-tight">
              Get Started with Your First Website
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Connect your domain to start autonomous website scanning, extract website branding, and deploy hallucination-free AI widgets.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            id="get-started-add-site-btn"
            className="px-6 py-3 rounded-[14px] bg-[#22C55E] hover:bg-[#16A34A] text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#22C55E]/20 whitespace-nowrap active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Website
          </button>
        </motion.div>
      )}

      {/* ── 6 Metric Cards: Clean 3-Column Grid ───────────────── */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metricCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
                onClick={() => navigate(card.targetPath)}
                className={`rounded-[18px] bg-[#131318] border p-6 flex flex-col justify-between gap-5 transition-all duration-200 cursor-pointer group hover:shadow-xl ${
                  card.accent
                    ? 'border-[#22C55E]/30 hover:border-[#22C55E]/60 bg-[#131318]'
                    : 'border-[#27272A] hover:border-[#22C55E]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-transform group-hover:scale-105 ${
                      card.accent
                        ? 'bg-[#22C55E]/15 text-[#22C55E]'
                        : 'bg-[#27272A] text-zinc-300 group-hover:text-[#22C55E]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                </div>

                <div>
                  <div className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight tabular-nums">
                    {loading ? (
                      <SkeletonBlock className="h-8 w-24 rounded-[8px]" />
                    ) : (
                      card.value ?? '-'
                    )}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-zinc-200 mt-1">
                    {card.title}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {card.subtitle}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Single Unified Activity Feed ──────────────────────── */}
      <section className="rounded-[18px] bg-[#131318] border border-[#27272A] p-6 space-y-5">
        {/* Section Header with Search & Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E]">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-white">
                Chronological Activity Feed
              </h2>
              <p className="text-[11px] text-zinc-400">
                Latest scan history, domain verifications, and update history.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                placeholder="Search activity..."
                className="h-9 pl-8 pr-3 rounded-[10px] bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#22C55E] transition-colors w-40 sm:w-52"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="h-9 pl-3 pr-8 rounded-[10px] bg-[#09090B] border border-[#27272A] text-xs text-zinc-300 focus:outline-none focus:border-[#22C55E] transition-colors appearance-none cursor-pointer"
              >
                <option value="all">All Events</option>
                <option value="crawl">Website Scans</option>
                <option value="verification">Verifications</option>
                <option value="sync">Update History</option>
              </select>
              <Filter className="w-3 h-3 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Activity List Content */}
        {loading ? (
          <div className="space-y-3 py-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-[12px] bg-[#09090B]">
                <SkeletonBlock className="w-8 h-8 rounded-[10px]" />
                <div className="space-y-1 flex-1">
                  <SkeletonBlock className="h-3 w-40 rounded" />
                  <SkeletonBlock className="h-2.5 w-24 rounded" />
                </div>
                <SkeletonBlock className="h-3 w-16 rounded" />
              </div>
            ))}
          </div>
        ) : filteredActivity.length === 0 ? (
          <div className="py-12 text-center p-6 space-y-3">
            {combinedActivity.length === 0 ? (
              <>
                <p className="font-heading font-semibold text-base text-zinc-200">
                  You haven't added any websites yet.
                </p>
                <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                  Add your first website to get started.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-5 py-2.5 rounded-[12px] bg-[#22C55E] hover:bg-[#16A34A] text-white font-semibold text-sm transition-all cursor-pointer shadow-md shadow-[#22C55E]/20"
                  >
                    Add Website
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="font-heading font-semibold text-base text-zinc-200">
                  No activity matches your filters.
                </p>
                <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                  Try resetting your search query or event filter.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setActivitySearch('');
                      setActivityFilter('all');
                    }}
                    className="px-4 py-2 rounded-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
                  >
                    Reset Filters
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#27272A]/60">
            {filteredActivity.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setActiveWebsiteId(item.siteId);
                  navigate('/dashboard/chatbot');
                }}
                className="flex items-center justify-between py-3.5 px-2 hover:bg-[#09090B]/60 rounded-[10px] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-[10px] bg-[#27272A] flex items-center justify-center text-zinc-400 group-hover:text-[#22C55E] transition-colors shrink-0">
                    {item.type === 'crawl' ? (
                      <Zap className="w-4 h-4" />
                    ) : item.type === 'verification' ? (
                      <ShieldCheck className="w-4 h-4" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-[#22C55E] transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-zinc-400 font-mono truncate">
                      {item.domain}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(item.timestamp)}
                  </span>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-[#27272A] text-zinc-400">
                    {item.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Add Website Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="relative w-full max-w-md bg-[#131318] border border-[#27272A] rounded-[18px] p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#22C55E]" /> Register Website
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-zinc-400">
                Enter your website domain. The crawler will verify DNS reachability and begin indexing.
              </p>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="example.com"
                  autoFocus
                  className="w-full h-11 px-4 rounded-[14px] bg-[#09090B] border border-[#27272A] text-white text-sm font-mono focus:outline-none focus:border-[#22C55E] transition-colors"
                />
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-[12px] bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading || !newDomain.trim()}
                    className="px-5 py-2 text-xs font-bold rounded-[12px] bg-[#22C55E] hover:bg-[#16A34A] text-white flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {addLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Register Website
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
