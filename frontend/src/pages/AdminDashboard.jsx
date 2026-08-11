import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { logout } from '../store/authSlice';
import ThemeToggle from '../components/ThemeToggle';
import SkeletonBlock from '../components/ui/SkeletonBlock';
import LogoutConfirmModal from '../components/ui/LogoutConfirmModal';
import toast from 'react-hot-toast';
import {
  Users,
  Globe,
  ShieldCheck,
  Activity,
  BarChart2,
  Zap,
  LogOut,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  X,
  UserCheck,
  UserX,
  Loader2,
  Check
} from 'lucide-react';

/* ── Helpers ─────────────────────────────────────────────────── */

const formatDate = (iso) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatTimestamp = (iso) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '-';

const STATUS = {
  verified:  { label: 'Verified', color: 'text-accent', bg: 'bg-accent/10', dot: 'bg-accent', border: 'border-accent/20' },
  pending:   { label: 'Pending',  color: 'text-amber-400', bg: 'bg-amber-400/10', dot: 'bg-amber-400', border: 'border-amber-400/20' },
  failed:    { label: 'Failed',   color: 'text-red-400', bg: 'bg-red-400/10', dot: 'bg-red-400', border: 'border-red-400/20' },
  crawling:  { label: 'Crawling', color: 'text-blue-400', bg: 'bg-blue-400/10', dot: 'bg-blue-400', border: 'border-blue-400/20' }
};

/* ── Sub-components ──────────────────────────────────────────── */

const StatCard = ({ icon: Icon, label, value, sub, accent = false, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay, ease: 'easeOut' }}
    className={`rounded-[18px] border p-5 flex flex-col gap-3 transition-colors duration-200 ${
      accent
        ? 'bg-accent/8 border-accent/25 hover:border-accent/45'
        : 'bg-white dark:bg-surface-dark border-zinc-100 dark:border-border-dark hover:border-zinc-200 dark:hover:border-zinc-600'
    }`}
  >
    <div
      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
        accent
          ? 'bg-accent/15 text-accent'
          : 'bg-zinc-100 dark:bg-zinc-800 text-txt-secondary-light dark:text-txt-secondary-dark'
      }`}
    >
      <Icon className="w-4.5 h-4.5" strokeWidth={1.8} />
    </div>
    <div>
      <div
        className={`font-heading text-2xl font-bold tabular-nums ${
          accent ? 'text-accent' : 'text-txt-primary-light dark:text-txt-primary-dark'
        }`}
      >
        {value}
      </div>
      <div className="text-sm font-medium text-txt-primary-light dark:text-txt-primary-dark mt-0.5">
        {label}
      </div>
      {sub && (
        <div className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
          {sub}
        </div>
      )}
    </div>
  </motion.div>
);

const StatusBadge = ({ status }) => {
  const cfg = STATUS[status] || STATUS.verified;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

/* ── Main Component ──────────────────────────────────────────── */

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const { user, token } = useSelector((s) => s.auth);

  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'websites'
  const [stats, setStats] = useState({ totalUsers: 0, totalWebsites: 0, crawlsToday: 0, totalChunks: 0 });
  const [users, setUsers] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUserIds, setExpandedUserIds] = useState(new Set());

  /* Edit User Modal */
  const [editUser, setEditUser] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '', role: 'user' });
  const [editLoading, setEditLoading] = useState(false);

  /* Delete User Modal */
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* Force Crawl state */
  const [crawlingSiteId, setCrawlingSiteId] = useState(null);

  /* Logout confirm */
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Fetch admin data
  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, usersRes, websitesRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/websites', { headers })
      ]);

      if (statsRes.ok) setStats(await statsRes.ok ? await statsRes.json() : stats);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (websitesRes.ok) setWebsites(await websitesRes.json());
    } catch (err) {
      toast.error('Failed to load admin dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  // Toggle user row expansion
  const toggleUserExpand = (userId) => {
    setExpandedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.websites || []).some((w) => w.domain.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  // Filtered Websites
  const filteredWebsites = useMemo(() => {
    if (!searchQuery.trim()) return websites;
    const q = searchQuery.toLowerCase();
    return websites.filter(
      (w) =>
        w.domain.toLowerCase().includes(q) ||
        (w.user && w.user.email.toLowerCase().includes(q)) ||
        w.verification_status.toLowerCase().includes(q)
    );
  }, [websites, searchQuery]);

  // Handle Edit User
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');

      toast.success(`User ${data.email} updated`);
      setEditUser(null);
      fetchAdminData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Delete User
  const handleDeleteConfirm = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');

      toast.success(`User ${deleteUser.email} deleted`);
      setDeleteUser(null);
      fetchAdminData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle Force Crawl
  const handleForceCrawl = async (websiteId, domain) => {
    setCrawlingSiteId(websiteId);
    try {
      const res = await fetch(`/api/admin/websites/${websiteId}/crawl`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger crawl');

      toast.success(`Re-crawl triggered for ${domain}`);
      fetchAdminData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCrawlingSiteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-page-dark text-txt-primary-light dark:text-txt-primary-dark flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl border-b border-zinc-200 dark:border-border-dark transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-[#09090B]" strokeWidth={2.5} />
            </div>
            <span className="font-heading font-bold text-lg tracking-tight text-zinc-900 dark:text-white">
              Site<span className="text-accent">Mind</span>
            </span>
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent/10 border border-accent/20 text-accent">
              Admin Portal
            </span>
          </div>

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
              id="admin-logout"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
        >
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
              System Administration
            </h1>
            <p className="text-sm text-txt-secondary-light dark:text-txt-secondary-dark">
              Monitor registered tenants, inspect domain crawls, and manage system access.
            </p>
          </div>
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-surface-dark border border-zinc-200 dark:border-border-dark text-xs font-semibold text-txt-primary-light dark:text-txt-primary-dark hover:border-accent transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </motion.div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Users" value={stats.totalUsers} sub="Registered tenants" delay={0} />
          <StatCard icon={Globe} label="Total Websites" value={stats.totalWebsites} sub="Registered domains" accent delay={0.08} />
          <StatCard icon={Activity} label="Crawls Today" value={stats.crawlsToday} sub="Active & past jobs" delay={0.16} />
          <StatCard icon={BarChart2} label="Indexed Chunks" value={stats.totalChunks.toLocaleString()} sub="RAG Knowledge base" delay={0.24} />
        </div>

        {/* Search & Tabs control bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-surface-dark border border-zinc-100 dark:border-border-dark p-4 rounded-[18px]">
          {/* Segmented Tab */}
          <div className="flex p-1 rounded-[14px] bg-zinc-100 dark:bg-[#18181B] border border-zinc-200 dark:border-border-dark w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-bold rounded-[12px] transition-all flex items-center justify-center gap-2 ${
                activeTab === 'users'
                  ? 'bg-white dark:bg-surface-dark text-zinc-900 dark:text-white shadow-sm'
                  : 'text-txt-secondary-light dark:text-txt-secondary-dark hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Registered Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('websites')}
              className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-bold rounded-[12px] transition-all flex items-center justify-center gap-2 ${
                activeTab === 'websites'
                  ? 'bg-white dark:bg-surface-dark text-zinc-900 dark:text-white shadow-sm'
                  : 'text-txt-secondary-light dark:text-txt-secondary-dark hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Crawled Websites ({websites.length})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'users' ? 'Search by name or email…' : 'Search by domain or status…'}
              className="w-full h-10 pl-10 pr-4 rounded-[14px] border border-zinc-200 dark:border-border-dark bg-zinc-50 dark:bg-[#0E0E12] text-xs text-txt-primary-light dark:text-txt-primary-dark focus:outline-none focus:border-accent transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── TAB 1: Registered Users View ── */}
        {activeTab === 'users' && (
          <section className="space-y-4">
            <div className="rounded-[18px] bg-white dark:bg-surface-dark border border-zinc-100 dark:border-border-dark overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/40 text-[11px] font-bold uppercase tracking-wider text-txt-secondary-light dark:text-txt-secondary-dark border-b border-zinc-100 dark:border-border-dark">
                    <tr>
                      <th className="w-10 px-4 py-3.5"></th>
                      <th className="px-4 py-3.5">User</th>
                      <th className="px-4 py-3.5">Role</th>
                      <th className="px-4 py-3.5">Registered Sites</th>
                      <th className="px-4 py-3.5">Joined Date</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-border-dark">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-txt-secondary-light dark:text-txt-secondary-dark">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-accent" />
                          Loading registered users…
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-txt-secondary-light dark:text-txt-secondary-dark">
                          No users found matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isExpanded = expandedUserIds.has(u.id);
                        const hasWebsites = u.websites && u.websites.length > 0;
                        return (
                          <React.Fragment key={u.id}>
                            <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                              <td className="px-4 py-4">
                                {hasWebsites ? (
                                  <button
                                    onClick={() => toggleUserExpand(u.id)}
                                    className="p-1 rounded-lg text-txt-secondary-light hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-accent" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                  </button>
                                ) : (
                                  <span className="w-4 h-4 block" />
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <div>
                                  <div className="font-semibold text-zinc-900 dark:text-white">
                                    {u.name || 'Unnamed User'}
                                  </div>
                                  <div className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark font-mono">
                                    {u.email}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    u.role === 'admin'
                                      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                      : 'bg-zinc-100 dark:bg-zinc-800 text-txt-secondary-light dark:text-txt-secondary-dark'
                                  }`}
                                >
                                  {u.role === 'admin' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                                  {u.role}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <span className="font-semibold text-zinc-900 dark:text-white">
                                  {u.websites ? u.websites.length : 0} site(s)
                                </span>
                              </td>
                              <td className="px-4 py-4 text-xs text-txt-secondary-light dark:text-txt-secondary-dark">
                                {formatDate(u.created_at)}
                              </td>
                              <td className="px-4 py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => {
                                      setEditUser(u);
                                      setEditFormData({ name: u.name || '', email: u.email, role: u.role || 'user' });
                                    }}
                                    className="p-1.5 rounded-lg text-txt-secondary-light dark:text-txt-secondary-dark hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-accent transition-colors"
                                    title="Edit User"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteUser(u)}
                                    className="p-1.5 rounded-lg text-txt-secondary-light dark:text-txt-secondary-dark hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 transition-colors"
                                    title="Delete User"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Nested Expandable Website Rows */}
                            {isExpanded && hasWebsites && (
                              <tr className="bg-zinc-50/80 dark:bg-[#0E0E12]">
                                <td colSpan={6} className="px-8 py-4">
                                  <div className="space-y-2">
                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-txt-secondary-light dark:text-txt-secondary-dark mb-2">
                                      Websites Registered by {u.email}:
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {u.websites.map((site) => (
                                        <div
                                          key={site.id}
                                          className="p-3.5 rounded-[14px] bg-white dark:bg-surface-dark border border-zinc-200 dark:border-border-dark flex items-center justify-between"
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                                              <Globe className="w-4 h-4" />
                                            </div>
                                            <div>
                                              <div className="font-semibold text-xs text-zinc-900 dark:text-white font-mono">
                                                {site.domain}
                                              </div>
                                              <div className="text-[10px] text-txt-secondary-light dark:text-txt-secondary-dark">
                                                Chunks Indexed: <span className="font-bold text-accent">{site.chunksCount}</span>
                                              </div>
                                            </div>
                                          </div>
                                          <StatusBadge status={site.verification_status} />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ── TAB 2: Crawled Websites View ── */}
        {activeTab === 'websites' && (
          <section className="space-y-4">
            <div className="rounded-[18px] bg-white dark:bg-surface-dark border border-zinc-100 dark:border-border-dark overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/40 text-[11px] font-bold uppercase tracking-wider text-txt-secondary-light dark:text-txt-secondary-dark border-b border-zinc-100 dark:border-border-dark">
                    <tr>
                      <th className="px-4 py-3.5">Website Domain</th>
                      <th className="px-4 py-3.5">Owner Email</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Indexed Chunks</th>
                      <th className="px-4 py-3.5">Last Crawled</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-border-dark">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-txt-secondary-light dark:text-txt-secondary-dark">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-accent" />
                          Loading crawled websites…
                        </td>
                      </tr>
                    ) : filteredWebsites.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-txt-secondary-light dark:text-txt-secondary-dark">
                          No websites found matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredWebsites.map((site) => (
                        <tr key={site.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                          <td className="px-4 py-4 font-mono font-semibold text-zinc-900 dark:text-white">
                            {site.domain}
                          </td>
                          <td className="px-4 py-4 text-xs font-mono text-txt-secondary-light dark:text-txt-secondary-dark">
                            {site.user?.email || `User #${site.user_id}`}
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge status={site.verification_status} />
                          </td>
                          <td className="px-4 py-4 font-semibold text-accent">
                            {site.chunksCount} chunks
                          </td>
                          <td className="px-4 py-4 text-xs text-txt-secondary-light dark:text-txt-secondary-dark">
                            {formatTimestamp(site.latestCrawl?.completed_at || site.latestCrawl?.started_at)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              onClick={() => handleForceCrawl(site.id, site.domain)}
                              disabled={crawlingSiteId === site.id}
                              className="px-3 py-1.5 rounded-[10px] bg-accent/10 border border-accent/20 text-accent hover:bg-accent hover:text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            >
                              {crawlingSiteId === site.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5" />
                              )}
                              Force Re-Crawl
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ── Edit User Modal ── */}
      <AnimatePresence>
        {editUser && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setEditUser(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-surface-dark border border-zinc-200 dark:border-border-dark rounded-[18px] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-accent" /> Edit User Profile
                </h3>
                <button onClick={() => setEditUser(null)} className="p-1 rounded text-zinc-400 hover:text-zinc-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">Name</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-[12px] border border-zinc-200 dark:border-border-dark bg-zinc-50 dark:bg-[#0E0E12] text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full h-10 px-3 rounded-[12px] border border-zinc-200 dark:border-border-dark bg-zinc-50 dark:bg-[#0E0E12] text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">Role</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full h-10 px-3 rounded-[12px] border border-zinc-200 dark:border-border-dark bg-zinc-50 dark:bg-[#0E0E12] text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditUser(null)}
                    className="px-4 py-2 rounded-[12px] bg-zinc-100 dark:bg-zinc-800 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="px-4 py-2 rounded-[12px] bg-accent text-white text-sm font-semibold flex items-center gap-1.5"
                  >
                    {editLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete User Confirmation Modal ── */}
      <AnimatePresence>
        {deleteUser && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setDeleteUser(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-surface-dark border border-zinc-200 dark:border-border-dark rounded-[18px] p-6 shadow-2xl"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-zinc-900 dark:text-white">
                    Delete Registered User?
                  </h3>
                  <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-1 leading-relaxed">
                    This will permanently delete user <span className="font-bold text-zinc-900 dark:text-white">{deleteUser.email}</span> along with all registered websites, crawl jobs, and indexed document chunks.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteUser(null)}
                  className="px-4 py-2 rounded-[12px] bg-zinc-100 dark:bg-zinc-800 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteLoading}
                  className="px-5 py-2 rounded-[12px] bg-red-500 hover:bg-red-600 text-white text-sm font-semibold flex items-center gap-1.5"
                >
                  {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Delete User
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          dispatch(logout());
          setShowLogoutModal(false);
        }}
      />
    </div>
  );
};

export default AdminDashboard;
