import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import toast from 'react-hot-toast';
import LogoutConfirmModal from '../components/ui/LogoutConfirmModal';
import ConfirmModal from '../components/ui/ConfirmModal';

import AdminSidebar, { ADMIN_PAGES } from '../components/admin/AdminSidebar';
import AdminHeader from '../components/admin/AdminHeader';

// 6 Analytics Tabs
import PlatformOverviewTab from '../components/admin/PlatformOverviewTab';
import WebsiteHealthTab from '../components/admin/WebsiteHealthTab';
import QueryIntelligenceTab from '../components/admin/QueryIntelligenceTab';
import UserActivityTab from '../components/admin/UserActivityTab';
import SystemPerformanceTab from '../components/admin/SystemPerformanceTab';
import ContentQualityTab from '../components/admin/ContentQualityTab';

// Existing Management UI retained
import {
  Users,
  Globe,
  Edit2,
  Trash2,
  Play,
  RotateCw,
  Search,
  ChevronDown,
  ChevronRight,
  UserCheck,
  UserX,
  X,
  Loader2
} from 'lucide-react';

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const { user, token } = useSelector((s) => s.auth);

  // Active page selection
  const [activePage, setActivePage] = useState(ADMIN_PAGES.OVERVIEW);
  const [dateRange, setDateRange] = useState('30d');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Analytics data states
  const [overviewData, setOverviewData] = useState(null);
  const [websiteHealthData, setWebsiteHealthData] = useState(null);
  const [queryIntelData, setQueryIntelData] = useState(null);
  const [userActivityData, setUserActivityData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [contentQualityData, setContentQualityData] = useState(null);

  // Existing management states
  const [manageUsers, setManageUsers] = useState([]);
  const [manageWebsites, setManageWebsites] = useState([]);
  const [manageSearch, setManageSearch] = useState('');
  const [expandedUserIds, setExpandedUserIds] = useState(new Set());
  const [editUser, setEditUser] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '', role: 'user' });
  const [editLoading, setEditLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'user'|'website', id, label }

  // Global loading tracker
  const [loading, setLoading] = useState(true);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${token}`
  }), [token]);

  // Fetch data depending on active page
  const fetchPageData = useCallback(async (page, range) => {
    setLoading(true);
    const headers = authHeaders();

    try {
      if (page === ADMIN_PAGES.OVERVIEW) {
        const res = await fetch(`/api/admin/analytics/overview?range=${range}`, { headers });
        if (res.ok) setOverviewData(await res.json());
      } else if (page === ADMIN_PAGES.WEBSITE_HEALTH) {
        const res = await fetch(`/api/admin/analytics/websites?range=${range}`, { headers });
        if (res.ok) setWebsiteHealthData(await res.json());
      } else if (page === ADMIN_PAGES.QUERY_INTELLIGENCE) {
        const res = await fetch(`/api/admin/analytics/queries?range=${range}`, { headers });
        if (res.ok) setQueryIntelData(await res.json());
      } else if (page === ADMIN_PAGES.USER_ACTIVITY) {
        const res = await fetch(`/api/admin/analytics/users?range=${range}`, { headers });
        if (res.ok) setUserActivityData(await res.json());
      } else if (page === ADMIN_PAGES.SYSTEM_PERFORMANCE) {
        const res = await fetch(`/api/admin/analytics/performance?range=${range}`, { headers });
        if (res.ok) setPerformanceData(await res.json());
      } else if (page === ADMIN_PAGES.CONTENT_QUALITY) {
        const res = await fetch(`/api/admin/analytics/content-quality?range=${range}`, { headers });
        if (res.ok) setContentQualityData(await res.json());
      } else if (page === ADMIN_PAGES.MANAGE_USERS) {
        const res = await fetch('/api/admin/users', { headers });
        if (res.ok) setManageUsers(await res.json());
      } else if (page === ADMIN_PAGES.MANAGE_WEBSITES) {
        const res = await fetch('/api/admin/websites', { headers });
        if (res.ok) setManageWebsites(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch admin page data:', err);
      toast.error('Failed to load telemetry data');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchPageData(activePage, dateRange);
  }, [activePage, dateRange, fetchPageData]);

  // Actions
  const handleTriggerCrawl = async (websiteId) => {
    try {
      const toastId = toast.loading('Initiating background crawler job...');
      const res = await fetch(`/api/admin/websites/${websiteId}/crawl`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger crawl');
      toast.success(data.message || 'Crawl job queued successfully!', { id: toastId });
      fetchPageData(activePage, dateRange);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleSuspendWebsite = async (websiteId) => {
    try {
      const res = await fetch(`/api/admin/websites/${websiteId}/suspend`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update website status');
      toast.success(data.message || 'Website status updated');
      fetchPageData(activePage, dateRange);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteWebsite = (websiteId, domain) => {
    setDeleteConfirm({
      type: 'website',
      id: websiteId,
      label: `domain ${domain}`
    });
  };

  const handleToggleSuspendUser = async (userId) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update account status');
      toast.success(data.message || 'Account status updated');
      fetchPageData(activePage, dateRange);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEditRole = async (userId, newRole) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change user role');
      toast.success(`User role updated to ${newRole}`);
      fetchPageData(activePage, dateRange);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteUser = (userId, email) => {
    setDeleteConfirm({
      type: 'user',
      id: userId,
      label: `user ${email}`
    });
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'website') {
        const res = await fetch(`/api/admin/websites/${deleteConfirm.id}`, {
          method: 'DELETE',
          headers: authHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete website');
        toast.success(data.message || 'Website deleted');
      } else if (deleteConfirm.type === 'user') {
        const res = await fetch(`/api/admin/users/${deleteConfirm.id}`, {
          method: 'DELETE',
          headers: authHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete user');
        toast.success(data.message || 'User deleted');
      }
      fetchPageData(activePage, dateRange);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteConfirm(null);
    }
  };

  // User management form submit
  const handleUserFormSubmit = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      toast.success('User updated successfully');
      setEditUser(null);
      fetchPageData(activePage, dateRange);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 flex transition-colors duration-200">
      {/* Sidebar Navigation */}
      <AdminSidebar
        activePage={activePage}
        setActivePage={setActivePage}
        user={user}
        onLogout={() => setShowLogoutModal(true)}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* Main Content Area (offset by 64 = 16rem for fixed sidebar on desktop) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <AdminHeader
          activePage={activePage}
          dateRange={dateRange}
          setDateRange={setDateRange}
          onRefresh={() => fetchPageData(activePage, dateRange)}
          loading={loading}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        {/* Page Tab Router Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {/* 1. Platform Overview */}
          {activePage === ADMIN_PAGES.OVERVIEW && (
            <PlatformOverviewTab
              data={overviewData}
              loading={loading && !overviewData}
            />
          )}

          {/* 2. Website Health */}
          {activePage === ADMIN_PAGES.WEBSITE_HEALTH && (
            <WebsiteHealthTab
              data={websiteHealthData}
              loading={loading && !websiteHealthData}
              onTriggerCrawl={handleTriggerCrawl}
              onToggleSuspend={handleToggleSuspendWebsite}
              onDeleteWebsite={handleDeleteWebsite}
            />
          )}

          {/* 3. Query Intelligence */}
          {activePage === ADMIN_PAGES.QUERY_INTELLIGENCE && (
            <QueryIntelligenceTab
              data={queryIntelData}
              loading={loading && !queryIntelData}
            />
          )}

          {/* 4. User Activity */}
          {activePage === ADMIN_PAGES.USER_ACTIVITY && (
            <UserActivityTab
              data={userActivityData}
              loading={loading && !userActivityData}
              onEditRole={handleEditRole}
              onToggleSuspendUser={handleToggleSuspendUser}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {/* 5. System Performance */}
          {activePage === ADMIN_PAGES.SYSTEM_PERFORMANCE && (
            <SystemPerformanceTab
              data={performanceData}
              loading={loading && !performanceData}
              onRetryCrawl={handleTriggerCrawl}
            />
          )}

          {/* 6. Content Quality */}
          {activePage === ADMIN_PAGES.CONTENT_QUALITY && (
            <ContentQualityTab
              data={contentQualityData}
              loading={loading && !contentQualityData}
              onTriggerCrawl={handleTriggerCrawl}
            />
          )}

          {/* Section: Management (Existing User Management) */}
          {activePage === ADMIN_PAGES.MANAGE_USERS && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-surface-dark border border-zinc-200 dark:border-border-dark p-4 rounded-[20px] shadow-xs">
                <div>
                  <h3 className="font-heading text-sm font-bold text-zinc-900 dark:text-white">
                    Tenant Accounts Directory
                  </h3>
                  <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark">
                    Search and directly modify tenant credentials and permissions.
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary-light dark:text-txt-secondary-dark" />
                  <input
                    type="text"
                    placeholder="Search name, email, domain..."
                    value={manageSearch}
                    onChange={(e) => setManageSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-border-dark text-zinc-900 dark:text-white focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark rounded-[22px] overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200/80 dark:border-border-dark bg-zinc-50/75 dark:bg-surface-dark/75 text-txt-secondary-light dark:text-txt-secondary-dark">
                      <th className="py-3 px-4 font-bold">User</th>
                      <th className="py-3 px-4 font-bold">Role</th>
                      <th className="py-3 px-4 font-bold">Registered</th>
                      <th className="py-3 px-4 font-bold">Websites</th>
                      <th className="py-3 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {manageUsers.filter(u => !manageSearch || u.email.toLowerCase().includes(manageSearch.toLowerCase())).map((u) => (
                      <React.Fragment key={u.id}>
                        <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                          <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-white">
                            <div>{u.name || 'Unnamed'}</div>
                            <div className="font-normal font-mono text-[11px] text-zinc-400">{u.email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.role === 'admin' ? 'bg-purple-500/10 text-purple-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => {
                                setExpandedUserIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(u.id)) next.delete(u.id);
                                  else next.add(u.id);
                                  return next;
                                });
                              }}
                              className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-accent/15 hover:text-accent font-semibold text-[11px] flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>{u.websites?.length || 0} domains</span>
                              {expandedUserIds.has(u.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditUser(u);
                                  setEditFormData({ name: u.name || '', email: u.email, role: u.role });
                                }}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedUserIds.has(u.id) && (
                          <tr className="bg-zinc-50/60 dark:bg-zinc-900/40">
                            <td colSpan={5} className="p-4 pl-10">
                              <div className="text-xs font-semibold text-zinc-500 mb-2">Registered Websites:</div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(u.websites || []).map((w) => (
                                  <div key={w.id} className="p-2.5 rounded-xl bg-white dark:bg-surface-dark border border-zinc-200/50 dark:border-border-dark flex items-center justify-between">
                                    <span className="font-medium text-zinc-900 dark:text-white truncate">{w.domain}</span>
                                    <span className="text-[10px] font-mono text-zinc-400">{w.chunksCount} chunks</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section: Management (Existing Websites Management) */}
          {activePage === ADMIN_PAGES.MANAGE_WEBSITES && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-surface-dark border border-zinc-200 dark:border-border-dark p-4 rounded-[20px] shadow-xs">
                <div>
                  <h3 className="font-heading text-sm font-bold text-zinc-900 dark:text-white">
                    Crawled & Registered Domains
                  </h3>
                  <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark">
                    Trigger crawls, review indexing progress, and inspect owner association.
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary-light dark:text-txt-secondary-dark" />
                  <input
                    type="text"
                    placeholder="Filter domains or owners..."
                    value={manageSearch}
                    onChange={(e) => setManageSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-border-dark text-zinc-900 dark:text-white focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark rounded-[22px] overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200/80 dark:border-border-dark bg-zinc-50/75 dark:bg-surface-dark/75 text-txt-secondary-light dark:text-txt-secondary-dark">
                      <th className="py-3 px-4 font-bold">Domain</th>
                      <th className="py-3 px-4 font-bold">Owner</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold">Chunks</th>
                      <th className="py-3 px-4 font-bold">Latest Crawl</th>
                      <th className="py-3 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {manageWebsites.filter(w => !manageSearch || w.domain.toLowerCase().includes(manageSearch.toLowerCase())).map((w) => (
                      <tr key={w.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                        <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                          <Globe className="w-4 h-4 text-accent shrink-0" />
                          <span>{w.domain}</span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-500 font-mono text-[11px]">
                          {w.user?.email || 'Unknown'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            w.verification_status === 'verified' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {w.verification_status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold">
                          {w.chunksCount?.toLocaleString() || 0}
                        </td>
                        <td className="py-3.5 px-4 text-[11px] font-mono text-zinc-500">
                          {w.latestCrawl?.status ? (
                            <span className="capitalize">{w.latestCrawl.status} ({w.latestCrawl.pages_crawled} pgs)</span>
                          ) : 'No crawls yet'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleTriggerCrawl(w.id)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-accent/15 hover:text-accent font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <RotateCw className="w-3 h-3" />
                              Crawl
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111115] border border-zinc-200 dark:border-border-dark rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-border-dark">
              <h4 className="font-heading text-sm font-bold text-zinc-900 dark:text-white">
                Edit User Details
              </h4>
              <button onClick={() => setEditUser(null)} className="p-1 rounded-lg text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUserFormSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-500">Full Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full mt-1 p-2 text-xs rounded-xl bg-zinc-50 dark:bg-surface-dark border border-zinc-200 dark:border-border-dark text-zinc-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-500">Email Address</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full mt-1 p-2 text-xs rounded-xl bg-zinc-50 dark:bg-surface-dark border border-zinc-200 dark:border-border-dark text-zinc-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-500">Account Role</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="w-full mt-1 p-2 text-xs rounded-xl bg-zinc-50 dark:bg-surface-dark border border-zinc-200 dark:border-border-dark text-zinc-900 dark:text-white font-semibold"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div className="pt-3 border-t border-zinc-200 dark:border-border-dark flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-1.5 rounded-xl bg-accent text-zinc-950 text-xs font-bold shadow-md shadow-accent/20 flex items-center gap-1.5"
                >
                  {editLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <ConfirmModal
          isOpen={Boolean(deleteConfirm)}
          title="Confirm Permanent Deletion"
          message={`Are you sure you want to permanently delete this ${deleteConfirm.label}? All related document chunks, crawls, and configuration will be deleted. This action cannot be reversed.`}
          confirmText="Yes, Delete"
          cancelText="Cancel"
          danger={true}
          onConfirm={executeDelete}
          onClose={() => setDeleteConfirm(null)}
        />
      )}

      {/* Logout Confirm Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          dispatch(logout());
          window.location.href = '/login';
        }}
      />
    </div>
  );
};

export default AdminDashboard;
