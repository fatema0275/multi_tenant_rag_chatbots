import React, { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { stopCrawl } from '../../store/websiteSlice';
import toast from 'react-hot-toast';
import {
  Activity,
  RefreshCw,
  ChevronDown,
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  SkipForward,
  Search,
  AlertTriangle,
  Square,
} from 'lucide-react';

const STATUS_CFG = {
  queued:    { label: 'Queued',    color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20',  dot: 'bg-amber-400',  Icon: Clock },
  running:   { label: 'Running',   color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/20',   dot: 'bg-blue-400',   Icon: Loader2 },
  completed: { label: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', dot: 'bg-emerald-400', Icon: CheckCircle2 },
  failed:    { label: 'Failed',    color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/20',    dot: 'bg-red-400',    Icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20',  dot: 'bg-amber-400',  Icon: XCircle },
};

const fmt = (iso) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '-';

const duration = (start, end) => {
  if (!start) return '-';
  const ms = new Date(end || Date.now()) - new Date(start);
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
};

// Tiny inline badge
const StatusBadge = ({ status }) => {
  const c = STATUS_CFG[status] || STATUS_CFG.queued;
  const { Icon } = c;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${c.bg} ${c.color} ${c.border}`}>
      <Icon className={`w-3 h-3 ${status === 'running' ? 'animate-spin' : ''}`} />
      {c.label}
    </span>
  );
};

// Counter pill
const CountPill = ({ value, label, color = 'text-txt-secondary-light dark:text-txt-secondary-dark' }) => (
  <div className="flex flex-col items-center min-w-[48px]">
    <span className={`text-base font-bold font-mono tabular-nums ${color}`}>{value ?? '-'}</span>
    <span className="text-[10px] text-txt-secondary-light dark:text-txt-secondary-dark uppercase tracking-wider mt-0.5">{label}</span>
  </div>
);

const CrawlStatusPanel = ({ activeWebsiteId }) => {
  const dispatch = useDispatch();
  const { websites } = useSelector((s) => s.websites);
  const token = useSelector((s) => s.auth.token);

  const [selectedId, setSelectedId] = useState(activeWebsiteId ? String(activeWebsiteId) : '');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  React.useEffect(() => {
    if (activeWebsiteId) {
      setSelectedId(String(activeWebsiteId));
      fetchJobs(activeWebsiteId);
    }
  }, [activeWebsiteId]);

  const fetchJobs = useCallback(async (websiteId) => {
    if (!websiteId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/websites/${websiteId}/crawl-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load crawl jobs');
        setJobs([]);
      } else {
        setJobs(Array.isArray(data) ? data : []);
        setLastFetched(new Date());
      }
    } catch {
      setError('Network error. Check backend process');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleSelect = (e) => {
    const id = e.target.value;
    setSelectedId(id);
    setJobs([]);
    setError(null);
    setLastFetched(null);
    if (id) fetchJobs(id);
  };

  const handleRefresh = () => {
    if (selectedId) fetchJobs(selectedId);
  };

  const handleStopCrawl = async () => {
    if (!selectedId || stopping) return;
    setStopping(true);
    const result = await dispatch(stopCrawl(Number(selectedId)));
    setStopping(false);

    if (stopCrawl.fulfilled.match(result)) {
      toast.success(
        result.payload.message || 'Crawl stopped. Chatbot is answering from partial content.'
      );
      fetchJobs(selectedId);
    } else {
      toast.error(result.payload || 'Failed to stop crawl.');
    }
  };

  const crawlableSites = websites.filter(
    (w) => !w.verification_status || w.verification_status === 'verified' || w.verification_status === 'pending'
  );

  if (!websites.length) return null;

  const selectedSite = websites.find((w) => String(w.id) === selectedId);
  const hasRunningJob = jobs.some((j) => j.status === 'running');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-[18px] bg-white dark:bg-surface-dark border border-zinc-100 dark:border-border-dark overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-4 border-b border-zinc-100 dark:border-border-dark">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          <h2 className="font-heading font-semibold text-[15px] text-zinc-900 dark:text-white">
            Scan History
          </h2>
          {lastFetched && (
            <span className="text-[10px] font-mono text-txt-secondary-light dark:text-txt-secondary-dark pl-1">
              updated {fmt(lastFetched)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Stop Scan button for running jobs */}
          {hasRunningJob && (
            <button
              onClick={handleStopCrawl}
              disabled={stopping}
              className="h-8 px-3 rounded-[10px] bg-red-500 hover:bg-red-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {stopping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5 fill-current" />}
              Stop Scan
            </button>
          )}

          {/* Site selector */}
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none z-10" />
            <select
              value={selectedId}
              onChange={handleSelect}
              className="h-8 pl-8 pr-7 rounded-[10px] border border-zinc-200 dark:border-border-dark bg-zinc-50 dark:bg-[#0E0E12] text-sm text-txt-primary-light dark:text-txt-primary-dark appearance-none focus:outline-none focus:border-accent transition-all cursor-pointer"
              aria-label="Select website to view scan history"
            >
              <option value="">Choose site...</option>
              {crawlableSites.map((site) => (
                <option key={site.id} value={String(site.id)}>
                  {site.domain}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={!selectedId || loading}
            title="Refresh"
            className="w-8 h-8 flex items-center justify-center rounded-[10px] border border-zinc-200 dark:border-border-dark bg-zinc-50 dark:bg-zinc-800 text-txt-secondary-light dark:text-txt-secondary-dark hover:text-accent hover:border-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-4">
        <AnimatePresence mode="wait">
          {/* No site selected */}
          {!selectedId && (
            <motion.div
              key="empty-select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 py-10 text-center"
            >
              <Search className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm text-txt-secondary-light dark:text-txt-secondary-dark">
                Select a website above to view its scan history.
              </p>
            </motion.div>
          )}

          {/* Loading */}
          {selectedId && loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-10 gap-2 text-txt-secondary-light dark:text-txt-secondary-dark"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading history...</span>
            </motion.div>
          )}

          {/* Error */}
          {selectedId && !loading && error && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 py-6 px-4 rounded-[14px] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* No jobs yet */}
          {selectedId && !loading && !error && jobs.length === 0 && (
            <motion.div
              key="no-jobs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-10 text-center space-y-2"
            >
              <p className="font-heading font-semibold text-base text-zinc-900 dark:text-zinc-200">
                No scan has been run yet.
              </p>
              <p className="text-sm text-txt-secondary-light dark:text-txt-secondary-dark max-w-sm mx-auto">
                Run a scan to index your website's content.
              </p>
            </motion.div>
          )}

          {/* Job list */}
          {selectedId && !loading && !error && jobs.length > 0 && (
            <motion.div
              key="job-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="divide-y divide-zinc-100 dark:divide-border-dark -mx-6"
            >
              {jobs.map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  {/* Status + type */}
                  <div className="flex flex-col gap-1.5 min-w-[90px]">
                    <StatusBadge status={job.status} />
                    {job.crawl_type && (
                      <span className="text-[10px] font-mono uppercase tracking-wider text-txt-secondary-light dark:text-txt-secondary-dark pl-0.5">
                        {job.crawl_type}
                      </span>
                    )}
                  </div>

                  {/* Page counters */}
                  <div className="flex items-center gap-4 flex-1">
                    <CountPill value={job.pages_found} label="found" />
                    <CountPill value={job.pages_crawled} label="crawled" color="text-emerald-500" />
                    <CountPill value={job.pages_skipped} label="skipped" color="text-amber-500" />
                    <CountPill value={job.pages_failed} label="failed" color="text-red-400" />
                  </div>

                  {/* Timing */}
                  <div className="text-right flex-shrink-0 min-w-[110px]">
                    <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark">
                      {fmt(job.started_at)}
                    </p>
                    <p className="text-[11px] font-mono text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
                      ⏱ {duration(job.started_at, job.completed_at)}
                    </p>
                    {job.error_message && (
                      <p className="text-[10px] text-red-400 mt-1 max-w-[160px] truncate" title={job.error_message}>
                        {job.error_message}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer note */}
      {jobs.length > 0 && (
        <div className="px-6 pb-4 pt-1 border-t border-zinc-100 dark:border-border-dark">
          <p className="text-[11px] text-txt-secondary-light dark:text-txt-secondary-dark">
            Showing last {jobs.length} job{jobs.length !== 1 ? 's' : ''}.
            For per-page crawl logs, query{' '}
            <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">crawl_logs</code>{' '}
            directly in Supabase.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default CrawlStatusPanel;
