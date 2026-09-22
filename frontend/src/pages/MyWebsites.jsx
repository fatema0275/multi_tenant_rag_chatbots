import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  triggerCrawl,
  addWebsite,
  updateWebsite,
  deleteWebsite,
} from '../store/websiteSlice';
import { useActiveWebsite } from '../context/ActiveWebsiteContext';
import SkeletonBlock from '../components/ui/SkeletonBlock';
import ConfirmModal from '../components/ui/ConfirmModal';
import CrawlStatusPanel from '../components/ui/CrawlStatusPanel';
import toast from 'react-hot-toast';
import {
  Globe,
  Plus,
  Play,
  Bot,
  BarChart3,
  Settings as SettingsIcon,
  Search,
  Filter,
  Clock,
  Layers,
  CheckCircle2,
  Zap,
  AlertTriangle,
  XCircle,
  Trash2,
  Edit2,
  X,
  Loader2,
  Activity,
} from 'lucide-react';

const formatTimestamp = (iso) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

const getBadgeConfig = (status, crawlStatus) => {
  const crawl = crawlStatus || 'pending';
  if (crawl === 'running' || crawl === 'crawling') {
    return {
      label: 'Scanning',
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      dot: 'bg-blue-400 animate-pulse',
      icon: Zap,
    };
  }
  if (crawl === 'failed') {
    return {
      label: 'Error',
      color: 'bg-red-500/10 text-red-400 border-red-500/20',
      dot: 'bg-red-400',
      icon: XCircle,
    };
  }
  if (crawl === 'completed' || status === 'verified') {
    return {
      label: crawl === 'completed' ? 'Ready' : 'Verified',
      color: 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20',
      dot: 'bg-[#22C55E]',
      icon: CheckCircle2,
    };
  }
  return {
    label: 'Pending',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dot: 'bg-amber-400',
    icon: Clock,
  };
};

const MyWebsites = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { websites, loading } = useSelector((s) => s.websites);
  const { activeWebsiteId, setActiveWebsiteId } = useActiveWebsite();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Register modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Edit modal
  const [editSite, setEditSite] = useState(null);
  const [editDomain, setEditDomain] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Crawling loading state per site
  const [crawlingSiteIds, setCrawlingSiteIds] = useState(new Set());
  const [selectedLogSiteId, setSelectedLogSiteId] = useState(null);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictSite, setConflictSite] = useState(null);

  const handleViewLogs = (site) => {
    setSelectedLogSiteId(site.id);
    const el = document.getElementById('crawl-logs-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredWebsites = useMemo(() => {
    return websites.filter((site) => {
      const matchSearch =
        !search.trim() ||
        site.domain?.toLowerCase().includes(search.toLowerCase());
      const crawlStatus = site.site?.crawl_status || site.crawl_status || 'pending';
      const badge = getBadgeConfig(site.verification_status, crawlStatus).label.toLowerCase();
      const matchStatus = statusFilter === 'all' || badge === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [websites, search, statusFilter]);

  const handleOpenStudio = (site) => {
    setActiveWebsiteId(site.id);
    navigate('/dashboard/chatbot');
  };

  const handleOpenAnalytics = (site) => {
    setActiveWebsiteId(site.id);
    navigate('/dashboard/analytics');
  };

  const handleCrawlNow = async (site, force = false) => {
    setCrawlingSiteIds((prev) => new Set(prev).add(site.id));
    const res = await dispatch(triggerCrawl({ websiteId: site.id, force }));
    setCrawlingSiteIds((prev) => {
      const next = new Set(prev);
      next.delete(site.id);
      return next;
    });

    if (triggerCrawl.fulfilled.match(res)) {
      toast.success(res.payload.message || `Crawl started for ${site.domain}`);
    } else {
      const errMsg = String(res.payload || '');
      if (errMsg.toLowerCase().includes('already running') || errMsg.toLowerCase().includes('conflict')) {
        setConflictSite(site);
        setConflictModalOpen(true);
      } else {
        toast.error(errMsg || 'Failed to trigger crawl');
      }
    }
  };

  const handleConfirmForceCrawl = async () => {
    if (!conflictSite) return;
    const target = conflictSite;
    setConflictModalOpen(false);
    setConflictSite(null);
    await handleCrawlNow(target, true);
  };

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

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editSite || !editDomain.trim()) return;
    setEditLoading(true);
    const result = await dispatch(
      updateWebsite({ id: editSite.id, domain: editDomain.trim() })
    );
    setEditLoading(false);

    if (updateWebsite.fulfilled.match(result)) {
      toast.success('Domain updated successfully');
      setEditSite(null);
      setEditDomain('');
    } else {
      toast.error(result.payload || 'Failed to update domain');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const result = await dispatch(deleteWebsite(deleteTarget.id));
    setDeleteLoading(false);

    if (deleteWebsite.fulfilled.match(result)) {
      toast.success(`${deleteTarget.domain} deleted`);
      setDeleteTarget(null);
    } else {
      toast.error(result.payload || 'Failed to delete website');
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
      {/* ── Page Title Header ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white tracking-tight">
            My Websites
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Manage registered domains, inspect crawling status, and launch AI widget studios.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          id="add-website-cta-btn"
          className="px-4 py-2.5 rounded-[12px] bg-[#22C55E] hover:bg-[#16A34A] text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-[#22C55E]/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Register Website
        </button>
      </div>

      {/* ── Search & Filter Controls ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search websites by domain..."
            className="w-full h-10 pl-10 pr-4 rounded-[12px] bg-[#131318] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#22C55E] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 pl-3 pr-8 rounded-[12px] bg-[#131318] border border-[#27272A] text-xs text-zinc-300 focus:outline-none focus:border-[#22C55E] transition-colors appearance-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="ready">Ready</option>
              <option value="verified">Verified</option>
              <option value="crawling">Scanning</option>
              <option value="error">Error</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <span className="text-xs text-zinc-500 px-2 font-mono">
            {filteredWebsites.length} site{filteredWebsites.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* ── Responsive 2-Column Grid of Website Cards ────────── */}
      {loading && websites.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[18px] bg-[#131318] border border-[#27272A] p-6 space-y-4"
            >
              <div className="flex justify-between items-start">
                <SkeletonBlock className="h-6 w-40 rounded" />
                <SkeletonBlock className="h-6 w-20 rounded-full" />
              </div>
              <SkeletonBlock className="h-4 w-60 rounded" />
              <div className="grid grid-cols-2 gap-4 pt-2">
                <SkeletonBlock className="h-10 rounded-[10px]" />
                <SkeletonBlock className="h-10 rounded-[10px]" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredWebsites.length === 0 ? (
        /* Empty State */
        <div className="py-16 rounded-[18px] bg-[#131318] border border-[#27272A] text-center p-8 space-y-3">
          {websites.length === 0 ? (
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
                No matching websites found.
              </p>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                Try resetting your search query or status filter to view registered websites.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredWebsites.map((site, index) => {
              const crawlStatus = site.site?.crawl_status || site.crawl_status;
              const badge = getBadgeConfig(site.verification_status, crawlStatus);
              const BadgeIcon = badge.icon;
              const lastCrawl = site.site?.last_crawled_at || site.updatedAt || site.updated_at;
              const chunkCount = site.tokens_used ? Math.round(site.tokens_used / 120) : 0;
              const isCrawling = crawlingSiteIds.has(site.id) || crawlStatus === 'running';

              return (
                <motion.div
                  key={site.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="rounded-[18px] bg-[#131318] border border-[#27272A] hover:border-[#22C55E]/30 p-6 flex flex-col justify-between gap-6 transition-all duration-200 shadow-sm hover:shadow-lg group"
                >
                  {/* Top Row: Name, Domain & Large Status Badge */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-[14px] bg-[#27272A] flex items-center justify-center text-[#22C55E] shrink-0 group-hover:scale-105 transition-transform">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        {/* Clicking card name sets active context and navigates to Studio */}
                        <button
                          onClick={() => handleOpenStudio(site)}
                          className="font-heading font-bold text-base text-white hover:text-[#22C55E] transition-colors truncate block text-left cursor-pointer"
                        >
                          {site.domain}
                        </button>
                        <p className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate">
                          tenant_{site.id}
                        </p>
                      </div>
                    </div>

                    {/* Large Status Badge */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0 ${badge.color}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                      <BadgeIcon className="w-3.5 h-3.5" />
                      <span>{badge.label}</span>
                    </div>
                  </div>

                  {/* Metadata Row: Last scan time & Content Block count */}
                  <div className="grid grid-cols-2 gap-4 py-3 px-4 rounded-[14px] bg-[#09090B] border border-[#27272A]/70">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-zinc-400" /> Last Scan
                      </span>
                      <p className="text-xs font-mono text-zinc-300 truncate">
                        {formatTimestamp(lastCrawl)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-zinc-400" /> Content Blocks
                      </span>
                      <p className="text-xs font-mono text-zinc-300">
                        {chunkCount} content blocks
                      </p>
                    </div>
                  </div>

                  {/* Bottom: Quick Action Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-[#27272A]/70">
                    {/* 1. Scan Website */}
                    <button
                      onClick={() => handleCrawlNow(site)}
                      disabled={isCrawling}
                      title="Trigger indexing scan now"
                      className="h-9 px-2 rounded-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isCrawling ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-[#22C55E]" />
                      )}
                      <span>Scan Website</span>
                    </button>

                    {/* 2. Scan History */}
                    <button
                      onClick={() => handleViewLogs(site)}
                      title="View live & historical scan history"
                      className="h-9 px-2 rounded-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Scan History</span>
                    </button>

                    {/* 3. Open Studio */}
                    <button
                      onClick={() => handleOpenStudio(site)}
                      title="Open in Chatbot Studio"
                      className="h-9 px-2 rounded-[10px] bg-[#22C55E]/15 hover:bg-[#22C55E]/25 text-[#22C55E] border border-[#22C55E]/30 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Studio</span>
                    </button>

                    {/* 4. View Analytics */}
                    <button
                      onClick={() => handleOpenAnalytics(site)}
                      title="View query & token analytics"
                      className="h-9 px-2 rounded-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Analytics</span>
                    </button>

                    {/* 5. Settings */}
                    <button
                      onClick={() => {
                        setEditSite(site);
                        setEditDomain(site.domain);
                      }}
                      title="Edit website domain or configuration"
                      className="h-9 px-2 rounded-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <SettingsIcon className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Settings</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── Live Crawl Logs & Jobs Panel ───────────────────────── */}
      <div id="crawl-logs-section" className="pt-2">
        <CrawlStatusPanel activeWebsiteId={selectedLogSiteId} />
      </div>

      {/* ── Register Website Modal ────────────────────────────── */}
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
              <p className="text-xs text-zinc-400 leading-relaxed">
                Provide the website domain to index. Content will be scanned, indexed, and made available for verified answer generation.
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

      {/* ── Settings / Edit Domain Modal ──────────────────────── */}
      <AnimatePresence>
        {editSite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditSite(null)}
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
                  <SettingsIcon className="w-4 h-4 text-[#22C55E]" /> Website Settings
                </h3>
                <button
                  onClick={() => setEditSite(null)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Domain Name
                  </label>
                  <input
                    type="text"
                    value={editDomain}
                    onChange={(e) => setEditDomain(e.target.value)}
                    placeholder="domain.com"
                    autoFocus
                    className="w-full h-11 px-4 rounded-[14px] bg-[#09090B] border border-[#27272A] text-white text-sm font-mono focus:outline-none focus:border-[#22C55E] transition-colors"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-[#27272A]">
                  <button
                    type="button"
                    onClick={() => {
                      const siteToDelete = editSite;
                      setEditSite(null);
                      setDeleteTarget(siteToDelete);
                    }}
                    className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Site
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditSite(null)}
                      className="px-4 py-2 text-xs font-semibold rounded-[12px] bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editLoading || !editDomain.trim()}
                      className="px-5 py-2 text-xs font-bold rounded-[12px] bg-[#22C55E] hover:bg-[#16A34A] text-white flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {editLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Destructive Delete Confirmation Modal ──────────────── */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
        title={`Delete ${deleteTarget?.domain}?`}
        description="This will permanently delete this website, purge all indexed content blocks, and deactivate its embedded chatbot widget. This action cannot be reversed."
        confirmText="Delete Website"
        cancelText="Keep Website"
        danger={true}
      />

      {/* ── Crawl Conflict Resolution Modal ───────────────────── */}
      <ConfirmModal
        isOpen={conflictModalOpen}
        onClose={() => { setConflictModalOpen(false); setConflictSite(null); }}
        onConfirm={handleConfirmForceCrawl}
        title="Crawl Already in Progress"
        description={`A crawl job is currently active or queued for ${conflictSite?.domain || 'this website'}. Would you like to terminate the active job and start a fresh crawl from scratch?`}
        confirmText="Cancel Active & Start Fresh"
        cancelText="Keep Current Job"
        danger={false}
      />
    </div>
  );
};

export default MyWebsites;
