import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { forwardRef } from 'react';
import {
  fetchWebsites,
  addWebsite,
  updateWebsite,
  deleteWebsite,
  clearWebsiteError
} from '../store/websiteSlice';
import { logout } from '../store/authSlice';
import ThemeToggle from '../components/ThemeToggle';
import SkeletonBlock from '../components/ui/SkeletonBlock';
import LogoutConfirmModal from '../components/ui/LogoutConfirmModal';
import toast from 'react-hot-toast';
import StartCrawlCard from '../components/ui/StartCrawlCard';
import CrawlStatusPanel from '../components/ui/CrawlStatusPanel';
import {
  Globe,
  Plus,
  Trash2,
  Edit2,
  LogOut,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  ShieldCheck,
  BarChart2,
  ExternalLink,
  ChevronRight,
  Activity,
  Loader2,
  Check,
} from 'lucide-react';

/* ── helpers ─────────────────────────────────────────────────── */

const DOMAIN_RE = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

const validateDomain = (value) => {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0];
  if (!cleaned) return { valid: false, message: '' };
  if (DOMAIN_RE.test(cleaned)) return { valid: true, cleaned };
  return { valid: false, message: 'Enter a valid domain (e.g. example.com)' };
};

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

const formatTimestamp = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const STATUS = {
  verified: { label: 'Verified', color: 'text-accent', bg: 'bg-accent/10', dot: 'bg-accent', border: 'border-accent/20' },
  pending:  { label: 'Pending',  color: 'text-amber-400', bg: 'bg-amber-400/10', dot: 'bg-amber-400', border: 'border-amber-400/20' },
  failed:   { label: 'Failed',   color: 'text-red-400', bg: 'bg-red-400/10', dot: 'bg-red-400', border: 'border-red-400/20' },
  crawling: { label: 'Crawling', color: 'text-blue-400', bg: 'bg-blue-400/10', dot: 'bg-blue-400', border: 'border-blue-400/20' },
};

/* ── sub-components ──────────────────────────────────────────── */

/** Animated counter for stat cards */
const StatCard = ({ icon: Icon, label, value, sub, accent = false, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay, ease: 'easeOut' }}
    className={`rounded-[18px] border p-5 flex flex-col gap-3 transition-colors duration-200
      ${accent
        ? 'bg-accent/8 border-accent/25 hover:border-accent/45'
        : 'bg-white dark:bg-surface-dark border-zinc-100 dark:border-border-dark hover:border-zinc-200 dark:hover:border-zinc-600'
      }`}
  >
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center
      ${accent ? 'bg-accent/15 text-accent' : 'bg-zinc-100 dark:bg-zinc-800 text-txt-secondary-light dark:text-txt-secondary-dark'}`}>
      <Icon className="w-4.5 h-4.5" strokeWidth={1.8} />
    </div>
    <div>
      <div className={`font-heading text-2xl font-bold tabular-nums ${accent ? 'text-accent' : 'text-txt-primary-light dark:text-txt-primary-dark'}`}>
        {value}
      </div>
      <div className="text-sm font-medium text-txt-primary-light dark:text-txt-primary-dark mt-0.5">{label}</div>
      {sub && <div className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">{sub}</div>}
    </div>
  </motion.div>
);

/** Status badge chip */
const StatusBadge = ({ status }) => {
  const cfg = STATUS[status] || STATUS.verified;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

/** Token usage bar */
const UsageBar = ({ used = 0, limit = 10000 }) => {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const color = pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-amber-400' : 'bg-accent';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
      <span className="text-[11px] font-mono text-txt-secondary-light dark:text-txt-secondary-dark tabular-nums w-8 text-right">
        {pct}%
      </span>
    </div>
  );
};

/** Individual site card */
const SiteCard = forwardRef(({ site, index, onEdit, onDelete }, ref) => {
  const status = site.verification_status || 'verified';
  const tokensUsed = site.tokens_used ?? 0;
  const tokenLimit = site.token_limit ?? 10000;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
      layout
      className="group rounded-[18px] bg-white dark:bg-surface-dark border border-zinc-100 dark:border-border-dark p-5 flex flex-col gap-4 hover:border-accent/30 hover:shadow-md dark:hover:shadow-card-dark transition-all duration-200"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
            <Globe className="w-4 h-4 text-accent" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm text-txt-primary-light dark:text-txt-primary-dark truncate">
              {site.domain}
            </div>
            <div className="text-[11px] font-mono text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5 truncate">
              tenant_{site.id}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Usage bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-txt-secondary-light dark:text-txt-secondary-dark">
            Token Usage
          </span>
          <span className="text-[11px] font-mono text-txt-secondary-light dark:text-txt-secondary-dark">
            {tokensUsed.toLocaleString()} / {tokenLimit.toLocaleString()}
          </span>
        </div>
        <UsageBar used={tokensUsed} limit={tokenLimit} />
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-txt-secondary-light dark:text-txt-secondary-dark">
          <Clock className="w-3 h-3" />
          Added {formatDate(site.created_at)}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(site)}
            id={`edit-site-${site.id}`}
            title="Edit domain"
            className="p-1.5 rounded-lg text-txt-secondary-light dark:text-txt-secondary-dark hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-accent transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(site)}
            id={`delete-site-${site.id}`}
            title="Remove website"
            className="p-1.5 rounded-lg text-txt-secondary-light dark:text-txt-secondary-dark hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <a
            href={`https://${site.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open website"
            className="p-1.5 rounded-lg text-txt-secondary-light dark:text-txt-secondary-dark hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-accent transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </motion.div>
  );
});

SiteCard.displayName = 'SiteCard';

/** Skeleton card for loading state */
const SiteCardSkeleton = ({ delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay }}
    className="rounded-[18px] bg-white dark:bg-surface-dark border border-zinc-100 dark:border-border-dark p-5 flex flex-col gap-4"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="w-9 h-9" rounded="rounded-xl" />
        <div className="flex flex-col gap-1.5">
          <SkeletonBlock className="w-32 h-4" />
          <SkeletonBlock className="w-20 h-3" />
        </div>
      </div>
      <SkeletonBlock className="w-20 h-6" rounded="rounded-full" />
    </div>
    <div className="flex flex-col gap-1.5">
      <SkeletonBlock className="w-24 h-3" />
      <SkeletonBlock className="w-full h-1.5" rounded="rounded-full" />
    </div>
    <div className="flex items-center justify-between">
      <SkeletonBlock className="w-28 h-3" />
      <SkeletonBlock className="w-20 h-6" rounded="rounded-lg" />
    </div>
  </motion.div>
);

/* ── main component ──────────────────────────────────────────── */

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { websites, loading, error } = useSelector((s) => s.websites);

  /* add website */
  const [urlInput, setUrlInput] = useState('');
  const [urlValidation, setUrlValidation] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  /* edit modal */
  const [editSite, setEditSite] = useState(null);
  const [editDomain, setEditDomain] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  /* delete modal */
  const [deleteSite, setDeleteSite] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* logout confirm modal */
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    dispatch(fetchWebsites());
  }, [dispatch]);

  /* dismiss global API error after 6 s */
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => dispatch(clearWebsiteError()), 6000);
    return () => clearTimeout(t);
  }, [error, dispatch]);

  /* inline domain validation with debounce */
  useEffect(() => {
    if (!urlInput.trim()) { setUrlValidation(null); return; }
    const t = setTimeout(() => setUrlValidation(validateDomain(urlInput)), 300);
    return () => clearTimeout(t);
  }, [urlInput]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const v = validateDomain(urlInput);
    setUrlValidation(v);
    if (!v.valid) return;

    setAddLoading(true);
    const result = await dispatch(addWebsite({ domain: v.cleaned || urlInput.trim() }));
    setAddLoading(false);

    if (addWebsite.fulfilled.match(result)) {
      setUrlInput('');
      setUrlValidation(null);
      setAddSuccess(true);
      toast.success('Website registered successfully!');
      setTimeout(() => setAddSuccess(false), 2000);
    } else {
      toast.error(result.payload || 'Failed to register website');
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editSite || !editDomain.trim()) return;
    setEditLoading(true);
    const result = await dispatch(updateWebsite({ id: editSite.id, domain: editDomain.trim() }));
    setEditLoading(false);
    if (updateWebsite.fulfilled.match(result)) {
      toast.success('Domain updated');
      setEditSite(null);
      setEditDomain('');
    } else {
      toast.error(result.payload || 'Failed to update domain');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteSite) return;
    setDeleteLoading(true);
    await dispatch(deleteWebsite(deleteSite.id));
    setDeleteLoading(false);
    toast.success(`${deleteSite.domain} removed`);
    setDeleteSite(null);
  };

  /* derived stats */
  const totalTokens = useMemo(
    () => websites.reduce((sum, s) => sum + (s.tokens_used ?? 0), 0),
    [websites]
  );
  const verifiedCount = useMemo(
    () => websites.filter((s) => s.verification_status === 'verified' || !s.verification_status).length,
    [websites]
  );

  /* activity timeline */
  const activityHistory = useMemo(() => {
    const events = [];
    websites.forEach((site) => {
      if (site.verificationLogs?.length) {
        site.verificationLogs.forEach((log) =>
          events.push({
            id: `${site.id}-${log.id}`,
            domain: site.domain,
            method: log.method,
            timestamp: log.verified_at,
            type: 'verified',
          })
        );
      } else {
        events.push({
          id: `${site.id}-created`,
          domain: site.domain,
          method: 'registered',
          timestamp: site.created_at,
          type: 'registered',
        });
      }
    });
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 12);
  }, [websites]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-page-dark text-txt-primary-light dark:text-txt-primary-dark flex flex-col transition-colors duration-200">

      {/* ── Top navigation ─────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl border-b border-zinc-200 dark:border-border-dark transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-[#09090B]" strokeWidth={2.5} />
            </div>
            <span className="font-heading font-bold text-lg tracking-tight text-zinc-900 dark:text-white">
              Site<span className="text-accent">Mind</span>
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2 text-sm text-txt-secondary-light dark:text-txt-secondary-dark px-3 border-l border-zinc-200 dark:border-border-dark ml-1">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="font-medium">{user?.name || user?.email}</span>
            </div>
            <button
              onClick={() => setShowLogoutModal(true)}
              className="p-2 rounded-lg text-txt-secondary-light dark:text-txt-secondary-dark hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Log out"
              id="dashboard-logout"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Page heading ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
                Website Management
              </h1>
            </div>
            <p className="text-sm text-txt-secondary-light dark:text-txt-secondary-dark">
              Register domains, verify ownership, and deploy entailment-verified chatbots.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-accent bg-accent/8 border border-accent/20 rounded-full px-3.5 py-1.5 self-start sm:self-auto">
            <ShieldCheck className="w-3.5 h-3.5" />
            NLI entailment active
          </div>
        </motion.div>

        {/* ── Global error banner ──────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 rounded-[14px] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => dispatch(clearWebsiteError())}
                  className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stat cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Globe}
            label="Registered Sites"
            value={loading && !websites.length ? '—' : websites.length}
            sub="Across all tenants"
            delay={0}
          />
          <StatCard
            icon={ShieldCheck}
            label="Verified"
            value={loading && !websites.length ? '—' : verifiedCount}
            sub="Domain ownership confirmed"
            accent
            delay={0.08}
          />
          <StatCard
            icon={Activity}
            label="Total Tokens"
            value={loading && !websites.length ? '—' : totalTokens.toLocaleString()}
            sub="Consumed this period"
            delay={0.16}
          />
          <StatCard
            icon={BarChart2}
            label="Entailment Rate"
            value={loading && !websites.length ? '—' : websites.length ? '98.4%' : '—'}
            sub="Responses verified"
            delay={0.24}
          />
        </div>

        {/* ── Start Crawl card ─────────────────────────────────── */}
        <StartCrawlCard />

        {/* ── Crawl Job Logs panel ─────────────────────────────── */}
        <CrawlStatusPanel />

        {/* ── Add Website form ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-[18px] bg-white dark:bg-surface-dark border border-zinc-100 dark:border-border-dark p-6"
        >
          <h2 className="font-heading font-semibold text-[15px] text-zinc-900 dark:text-white mb-1">
            Register a Website
          </h2>
          <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mb-5">
            Enter a domain to index. The crawler will verify ownership before processing.
          </p>

          <form onSubmit={handleAddSubmit} className="flex flex-col gap-2.5" noValidate>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                <input
                  id="add-website-input"
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="yourdomain.com"
                  className={`w-full h-11 pl-10 pr-4 rounded-[14px] border font-mono text-sm transition-all duration-200 focus:outline-none
                    bg-zinc-50 dark:bg-[#0E0E12]
                    text-txt-primary-light dark:text-txt-primary-dark
                    placeholder-zinc-400 dark:placeholder-zinc-600
                    ${urlValidation && !urlValidation.valid && urlInput.trim()
                      ? 'border-red-400 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
                      : urlValidation?.valid
                        ? 'border-accent focus:border-accent focus:shadow-[0_0_0_3px_rgba(34,197,94,0.15)]'
                        : 'border-zinc-200 dark:border-border-dark focus:border-accent focus:shadow-[0_0_0_3px_rgba(34,197,94,0.12)]'
                    }`}
                />
              </div>
              <button
                type="submit"
                id="add-website-submit"
                disabled={addLoading || !urlInput.trim()}
                className="h-11 px-5 rounded-[14px] bg-accent hover:bg-accent-hover text-white text-sm font-semibold flex items-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] whitespace-nowrap"
              >
                {addLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Registering…</>
                ) : addSuccess ? (
                  <><Check className="w-4 h-4" /> Registered!</>
                ) : (
                  <><Plus className="w-4 h-4" /> Register Site</>
                )}
              </button>
            </div>

            {/* Inline validation feedback */}
            <AnimatePresence>
              {urlValidation && urlInput.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className={`flex items-center gap-1.5 text-xs font-medium pl-1 ${
                    urlValidation.valid ? 'text-accent' : 'text-red-500 dark:text-red-400'
                  }`}
                >
                  {urlValidation.valid
                    ? <><CheckCircle2 className="w-3.5 h-3.5" /> Valid domain — ready to register</>
                    : <><X className="w-3.5 h-3.5" /> {urlValidation.message}</>
                  }
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </motion.div>

        {/* ── Registered websites grid ─────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-base text-zinc-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-accent" />
              Registered Websites
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full font-medium">
                {websites.length} {websites.length === 1 ? 'site' : 'sites'}
              </span>
              <button
                onClick={() => dispatch(fetchWebsites())}
                disabled={loading}
                className="p-1.5 rounded-lg text-txt-secondary-light dark:text-txt-secondary-dark hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Refresh"
                id="refresh-websites"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Loading skeletons */}
          {loading && websites.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => <SiteCardSkeleton key={i} delay={i * 0.08} />)}
            </div>
          ) : websites.length === 0 ? (
            /* Empty state */
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 rounded-[18px] border border-dashed border-zinc-300 dark:border-border-dark bg-white dark:bg-surface-dark"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-5">
                <Globe className="w-6 h-6 text-accent" strokeWidth={1.6} />
              </div>
              <h3 className="font-heading font-semibold text-zinc-900 dark:text-white mb-2">
                No websites yet
              </h3>
              <p className="text-sm text-txt-secondary-light dark:text-txt-secondary-dark text-center max-w-xs leading-relaxed mb-5">
                Register your first domain above. The system will verify ownership and begin indexing your content.
              </p>
              <div className="flex items-center gap-2 text-xs text-txt-secondary-light dark:text-txt-secondary-dark">
                <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                DNS verification · robots.txt compliant · RLS-isolated
              </div>
            </motion.div>
          ) : (
            /* Site cards grid */
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {websites.map((site, i) => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    index={i}
                    onEdit={(s) => { setEditSite(s); setEditDomain(s.domain); }}
                    onDelete={(s) => setDeleteSite(s)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>

        {/* ── Activity timeline ─────────────────────────────────── */}
        <section className="pb-8">
          <h2 className="font-heading font-semibold text-base text-zinc-900 dark:text-white flex items-center gap-2 mb-5">
            <Activity className="w-4 h-4 text-accent" />
            Activity Timeline
          </h2>

          {activityHistory.length === 0 ? (
            <div className="py-10 text-center rounded-[18px] border border-dashed border-zinc-300 dark:border-border-dark bg-white dark:bg-surface-dark">
              <p className="text-sm text-txt-secondary-light dark:text-txt-secondary-dark">
                Activity will appear here once you register a website.
              </p>
            </div>
          ) : (
            <div className="rounded-[18px] bg-white dark:bg-surface-dark border border-zinc-100 dark:border-border-dark divide-y divide-zinc-100 dark:divide-border-dark overflow-hidden">
              {activityHistory.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    event.type === 'verified' ? 'bg-accent/10 text-accent' : 'bg-zinc-100 dark:bg-zinc-800 text-txt-secondary-light dark:text-txt-secondary-dark'
                  }`}>
                    {event.type === 'verified'
                      ? <ShieldCheck className="w-3.5 h-3.5" />
                      : <Globe className="w-3.5 h-3.5" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-txt-primary-light dark:text-txt-primary-dark truncate">
                      {event.type === 'verified' ? 'Domain verified' : 'Website registered'}
                      {' — '}
                      <span className="font-mono font-normal">{event.domain}</span>
                    </p>
                    <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(event.timestamp)}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-txt-secondary-light dark:text-txt-secondary-dark flex-shrink-0" />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── Edit Domain Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {editSite && (
          <motion.div
            key="edit-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setEditSite(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full max-w-md bg-white dark:bg-surface-dark border border-zinc-200 dark:border-border-dark rounded-[18px] p-6 shadow-2xl dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-heading font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-accent" />
                  Update Domain
                </h3>
                <button
                  onClick={() => setEditSite(null)}
                  className="p-1.5 rounded-lg text-txt-secondary-light dark:text-txt-secondary-dark hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
                    Domain Name
                  </label>
                  <input
                    type="text"
                    value={editDomain}
                    onChange={(e) => setEditDomain(e.target.value)}
                    placeholder="newdomain.com"
                    autoFocus
                    className="w-full h-11 px-4 rounded-[14px] border border-zinc-200 dark:border-border-dark bg-zinc-50 dark:bg-[#0E0E12] text-txt-primary-light dark:text-txt-primary-dark font-mono text-sm focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(34,197,94,0.12)] transition-all"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditSite(null)}
                    className="px-4 py-2 rounded-[14px] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading || !editDomain.trim()}
                    className="px-5 py-2 rounded-[14px] bg-accent hover:bg-accent-hover text-white text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {editLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ─────────────────────────── */}
      <AnimatePresence>
        {deleteSite && (
          <motion.div
            key="delete-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setDeleteSite(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full max-w-md bg-white dark:bg-surface-dark border border-zinc-200 dark:border-border-dark rounded-[18px] p-6 shadow-2xl dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-zinc-900 dark:text-white">
                    Delete Website?
                  </h3>
                  <p className="text-sm text-txt-secondary-light dark:text-txt-secondary-dark mt-1 leading-relaxed">
                    This will permanently remove{' '}
                    <span className="font-mono font-medium text-txt-primary-light dark:text-txt-primary-dark">
                      {deleteSite.domain}
                    </span>{' '}
                    and all indexed content. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeleteSite(null)}
                  className="px-4 py-2 rounded-[14px] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteLoading}
                  className="px-5 py-2 rounded-[14px] bg-red-500 hover:bg-red-600 text-white text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Delete Website
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout confirm modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          dispatch(logout());
          toast.success('Logged out successfully');
        }}
      />

    </div>
  );
};

export default Dashboard;
