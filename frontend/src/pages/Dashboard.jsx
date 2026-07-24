import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchWebsites,
  addWebsite,
  updateWebsite,
  deleteWebsite,
  clearWebsiteError
} from '../store/websiteSlice';
import { logout } from '../store/authSlice';
import ThemeToggle from '../components/ThemeToggle';
import {
  Globe,
  ArrowRight,
  CheckCircle2,
  Trash2,
  Edit2,
  LogOut,
  RefreshCw,
  X,
  AlertCircle,
  Check,
  Clock,
  Plus
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
  if (DOMAIN_RE.test(cleaned)) return { valid: true, message: 'Valid domain' };
  return { valid: false, message: 'Enter a valid domain (e.g. example.com)' };
};

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatTimestamp = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusConfig = {
  verified: { dot: 'bg-status-active', label: 'Registered' },
  pending:  { dot: 'bg-status-pending', label: 'Pending' },
  failed:   { dot: 'bg-status-failed',  label: 'Failed' },
};

/* ── component ───────────────────────────────────────────────── */

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { websites, loading, error } = useSelector((state) => state.websites);

  // -- Add website (inline) --
  const [urlInput, setUrlInput] = useState('');
  const [urlValidation, setUrlValidation] = useState(null); // { valid, message }
  const [addLoading, setAddLoading] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  // -- Edit modal --
  const [editSite, setEditSite] = useState(null);
  const [editDomain, setEditDomain] = useState('');

  // -- Delete modal --
  const [deleteSite, setDeleteSite] = useState(null);

  useEffect(() => {
    dispatch(fetchWebsites());
  }, [dispatch]);

  // Validate on change
  useEffect(() => {
    if (!urlInput.trim()) {
      setUrlValidation(null);
      return;
    }
    const timer = setTimeout(() => {
      setUrlValidation(validateDomain(urlInput));
    }, 300);
    return () => clearTimeout(timer);
  }, [urlInput]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const v = validateDomain(urlInput);
    setUrlValidation(v);
    if (!v.valid) return;

    setAddLoading(true);
    const result = await dispatch(addWebsite({ domain: urlInput.trim() }));
    setAddLoading(false);

    if (addWebsite.fulfilled.match(result)) {
      setUrlInput('');
      setUrlValidation(null);
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 2000);
    } else {
      setUrlValidation({
        valid: false,
        message: result.payload || 'Failed to register website',
      });
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editSite || !editDomain.trim()) return;

    const result = await dispatch(
      updateWebsite({ id: editSite.id, domain: editDomain.trim() })
    );
    if (updateWebsite.fulfilled.match(result)) {
      setEditSite(null);
      setEditDomain('');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteSite) return;
    await dispatch(deleteWebsite(deleteSite.id));
    setDeleteSite(null);
  };

  // -- Activity history derived from verification logs --
  const activityHistory = useMemo(() => {
    const events = [];
    websites.forEach((site) => {
      if (site.verificationLogs) {
        site.verificationLogs.forEach((log) => {
          events.push({
            id: `${site.id}-${log.id}`,
            domain: site.domain,
            method: log.method,
            timestamp: log.verified_at,
            type: 'registered',
          });
        });
      }
      // Also add from created_at as a fallback
      if (!site.verificationLogs || site.verificationLogs.length === 0) {
        events.push({
          id: `${site.id}-created`,
          domain: site.domain,
          method: 'self_attested',
          timestamp: site.created_at,
          type: 'registered',
        });
      }
    });
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [websites]);

  return (
    <div className="min-h-screen bg-page-light dark:bg-page-dark text-txt-primary-light dark:text-txt-primary-dark flex flex-col transition-colors duration-200">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md border-b border-border-light dark:border-border-dark transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <span className="font-heading font-semibold text-lg tracking-tight">
              Site<span className="text-indigo-600 dark:text-indigo-400">Mind</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2 text-sm text-txt-secondary-light dark:text-txt-secondary-dark px-3">
              <div className="w-1.5 h-1.5 rounded-full bg-status-active" />
              <span>{user?.name || user?.email}</span>
            </div>
            <button
              onClick={() => dispatch(logout())}
              className="p-2 rounded-lg text-txt-secondary-light dark:text-txt-secondary-dark hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Log out"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Global error */}
        {error && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => dispatch(clearWebsiteError())}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page heading */}
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Website Management
          </h1>
          <p className="mt-1 text-sm text-txt-secondary-light dark:text-txt-secondary-dark">
            Register domains, manage tenants, and monitor usage.
          </p>
        </div>

        {/* ── Section 1: Add Website ──────────────────────── */}
        <section className="mb-8">
          <form onSubmit={handleAddSubmit} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="yourdomain.com"
                  className="w-full h-11 px-4 rounded-lg bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark focus:border-indigo-500 dark:focus:border-indigo-400 text-txt-primary-light dark:text-txt-primary-dark placeholder-zinc-400 dark:placeholder-zinc-500 font-mono text-[15px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  id="add-website-input"
                />
              </div>
              <button
                type="submit"
                disabled={addLoading || !urlInput.trim()}
                className="h-11 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap"
                id="add-website-submit"
              >
                {addLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : addSuccess ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {addLoading ? 'Adding…' : addSuccess ? 'Added!' : 'Add Website'}
              </button>
            </div>

            {/* Inline validation */}
            {urlValidation && urlInput.trim() && (
              <div className={`flex items-center gap-1.5 text-xs font-medium pl-1 ${
                urlValidation.valid
                  ? 'text-status-active'
                  : 'text-red-500 dark:text-red-400'
              }`}>
                {urlValidation.valid ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                <span>{urlValidation.message}</span>
              </div>
            )}
          </form>
        </section>

        {/* ── Section 2: Registered Websites ──────────────── */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-base font-semibold">
              Registered Websites
            </h2>
            <span className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark">
              {websites.length} {websites.length === 1 ? 'site' : 'sites'}
            </span>
          </div>

          {loading && websites.length === 0 ? (
            <div className="py-16 text-center">
              <RefreshCw className="w-5 h-5 animate-spin text-txt-secondary-light dark:text-txt-secondary-dark mx-auto mb-2" />
              <p className="text-sm text-txt-secondary-light dark:text-txt-secondary-dark">
                Loading websites…
              </p>
            </div>
          ) : websites.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-border-light dark:border-border-dark rounded-lg">
              <p className="text-sm text-txt-secondary-light dark:text-txt-secondary-dark mb-1">
                No websites registered yet.
              </p>
              <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark">
                Add your first domain above to get started.
              </p>
            </div>
          ) : (
            <div className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden">
              {/* Table header */}
              <div className="hidden md:grid grid-cols-[1fr_100px_140px_100px_110px_80px] gap-4 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border-b border-border-light dark:border-border-dark text-[11px] font-semibold uppercase tracking-wider text-txt-secondary-light dark:text-txt-secondary-dark">
                <span>Domain</span>
                <span>Status</span>
                <span>Tenant ID</span>
                <span>Tokens</span>
                <span>Added</span>
                <span />
              </div>

              {/* Table rows */}
              {websites.map((site) => {
                const status = statusConfig[site.verification_status] || statusConfig.verified;
                const tokensUsed = site.tokens_used ?? 0;

                return (
                  <div
                    key={site.id}
                    className="group grid grid-cols-1 md:grid-cols-[1fr_100px_140px_100px_110px_80px] gap-x-4 gap-y-1 px-4 py-3 border-b border-border-light dark:border-border-dark last:border-b-0 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors items-center"
                  >
                    {/* Domain */}
                    <div className="flex items-center gap-2 min-w-0">
                      <Globe className="w-4 h-4 text-txt-secondary-light dark:text-txt-secondary-dark shrink-0 hidden sm:block" />
                      <span className="font-medium text-sm truncate">
                        {site.domain}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${status.dot} shrink-0`} />
                      <span className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark">
                        {status.label}
                      </span>
                    </div>

                    {/* Tenant ID */}
                    <span className="font-mono text-xs text-txt-secondary-light dark:text-txt-secondary-dark truncate">
                      website_{site.id}
                    </span>

                    {/* Tokens Used */}
                    <span className="font-mono text-xs text-txt-secondary-light dark:text-txt-secondary-dark">
                      {tokensUsed.toLocaleString()}
                    </span>

                    {/* Date Added */}
                    <span className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark">
                      {formatDate(site.created_at)}
                    </span>

                    {/* Actions — visible on hover */}
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditSite(site);
                          setEditDomain(site.domain);
                        }}
                        className="p-1.5 rounded-md text-txt-secondary-light dark:text-txt-secondary-dark hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                        title="Edit domain"
                        id={`edit-site-${site.id}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteSite(site)}
                        className="p-1.5 rounded-md text-txt-secondary-light dark:text-txt-secondary-dark hover:bg-red-100 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete website"
                        id={`delete-site-${site.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Section 3: Activity History ─────────────────── */}
        <section>
          <h2 className="font-heading text-base font-semibold mb-3">
            Activity History
          </h2>

          {activityHistory.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-border-light dark:border-border-dark rounded-lg">
              <p className="text-sm text-txt-secondary-light dark:text-txt-secondary-dark">
                No activity yet.
              </p>
            </div>
          ) : (
            <div className="relative pl-6">
              {/* Timeline line */}
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border-light dark:bg-border-dark" />

              <div className="space-y-0">
                {activityHistory.map((event) => (
                  <div key={event.id} className="relative flex items-start gap-3 py-2.5">
                    {/* Timeline dot */}
                    <div className="absolute left-[-15px] top-[14px] w-[7px] h-[7px] rounded-full bg-border-light dark:bg-border-dark ring-2 ring-page-light dark:ring-page-dark" />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="text-txt-secondary-light dark:text-txt-secondary-dark">
                          Website registered
                        </span>
                        {' — '}
                        <span className="font-mono text-xs">
                          {event.domain}
                        </span>
                      </p>
                      <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(event.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ── Modal: Edit Domain ─────────────────────────────── */}
      {editSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-base flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Update Domain
              </h3>
              <button
                onClick={() => setEditSite(null)}
                className="p-1.5 rounded-md text-txt-secondary-light dark:text-txt-secondary-dark hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-txt-secondary-light dark:text-txt-secondary-dark uppercase tracking-wider mb-1.5">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={editDomain}
                  onChange={(e) => setEditDomain(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-page-light dark:bg-page-dark border border-border-light dark:border-border-dark focus:border-indigo-500 dark:focus:border-indigo-400 text-txt-primary-light dark:text-txt-primary-dark font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditSite(null)}
                  className="px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-sm font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white text-sm font-medium transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Delete Confirmation ─────────────────────── */}
      {deleteSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <h3 className="font-heading font-semibold text-base">
                Delete Website?
              </h3>
            </div>

            <p className="text-sm text-txt-secondary-light dark:text-txt-secondary-dark leading-relaxed">
              Are you sure you want to delete{' '}
              <span className="font-mono font-medium text-txt-primary-light dark:text-txt-primary-dark">
                {deleteSite.domain}
              </span>
              ? This will remove the website entry and all associated data.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setDeleteSite(null)}
                className="px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
