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
    <div className="min-h-screen bg-[#09090B] text-white flex font-sans antialiased">
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#131318] border border-[#27272A] p-4 rounded-[16px]">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Tenant Accounts Directory
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Search and directly modify tenant credentials and permissions.
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search name, email, domain..."
                    value={manageSearch}
                    onChange={(e) => setManageSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[10px] bg-[#09090B] border border-[#27272A] text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#22C55E]"
                  />
                </div>
              </div>

              <div className="bg-[#131318] border border-[#27272A] rounded-[16px] overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#27272A] bg-[#0E0E12] text-zinc-400 font-medium">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Registered</th>
                      <th className="py-3 px-4">Websites</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272A]/50 text-zinc-300">
                    {manageUsers.filter(u => !manageSearch || u.email.toLowerCase().includes(manageSearch.toLowerCase())).map((u) => (
                      <React.Fragment key={u.id}>
                        <tr className="hover:bg-[#181820] transition-colors">
                          <td className="py-3.5 px-4 font-medium text-white">
                            <div>{u.name || 'Unnamed'}</div>
                            <div className="font-normal text-[11px] text-zinc-400">{u.email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-[6px] text-[11px] font-medium capitalize border ${
                              u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-zinc-800 text-zinc-300 border-zinc-750'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[11px] text-zinc-400">
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
                              className="px-2.5 py-1 rounded-[6px] bg-[#09090B] border border-[#27272A] hover:border-[#22C55E]/50 text-zinc-300 text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <span>{u.websites?.length || 0} domains</span>
                              {expandedUserIds.has(u.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditUser(u);
                                  setEditFormData({ name: u.name || '', email: u.email, role: u.role });
                                }}
                                className="p-1.5 rounded-[8px] text-zinc-400 hover:text-white hover:bg-[#1C1C24] transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                className="p-1.5 rounded-[8px] text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedUserIds.has(u.id) && (
                          <tr className="bg-[#0E0E12]">
                            <td colSpan={5} className="p-4 pl-8">
                              <div className="text-xs font-medium text-zinc-400 mb-2">Registered Websites:</div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(u.websites || []).map((w) => (
                                  <div key={w.id} className="p-2.5 rounded-[10px] bg-[#131318] border border-[#27272A] flex items-center justify-between">
                                    <span className="font-medium text-white truncate">{w.domain}</span>
                                    <span className="text-[11px] text-zinc-400 tabular-nums">{w.chunksCount} chunks</span>
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#131318] border border-[#27272A] p-4 rounded-[16px]">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Crawled & Registered Domains
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Trigger crawls, review indexing progress, and inspect owner association.
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Filter domains or owners..."
                    value={manageSearch}
                    onChange={(e) => setManageSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[10px] bg-[#09090B] border border-[#27272A] text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#22C55E]"
                  />
                </div>
              </div>

              <div className="bg-[#131318] border border-[#27272A] rounded-[16px] overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#27272A] bg-[#0E0E12] text-zinc-400 font-medium">
                      <th className="py-3 px-4">Domain</th>
                      <th className="py-3 px-4">Owner</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Chunks</th>
                      <th className="py-3 px-4">Latest Crawl</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272A]/50 text-zinc-300">
                    {manageWebsites.filter(w => !manageSearch || w.domain.toLowerCase().includes(manageSearch.toLowerCase())).map((w) => (
                      <tr key={w.id} className="hover:bg-[#181820] transition-colors">
                        <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                          <span>{w.domain}</span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400 text-xs">
                          {w.user?.email || 'Unknown'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-[6px] text-[11px] font-medium capitalize border ${
                            w.verification_status === 'verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {w.verification_status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 tabular-nums text-zinc-300">
                          {w.chunksCount?.toLocaleString() || 0}
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-zinc-400">
                          {w.latestCrawl?.status ? (
                            <span className="capitalize">{w.latestCrawl.status} ({w.latestCrawl.pages_crawled} pgs)</span>
                          ) : 'No crawls yet'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleTriggerCrawl(w.id)}
                              className="px-2.5 py-1 rounded-[8px] bg-[#09090B] border border-[#27272A] hover:border-[#22C55E]/50 text-zinc-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <RotateCw className="w-3 h-3 text-[#22C55E]" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#131318] border border-[#27272A] rounded-[16px] w-full max-w-sm p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <h4 className="text-sm font-bold text-white">
                Edit User Details
              </h4>
              <button onClick={() => setEditUser(null)} className="p-1 rounded-[8px] text-zinc-400 hover:text-white hover:bg-[#1C1C24] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUserFormSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-300">Full Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full mt-1 p-2 text-xs rounded-[10px] bg-[#09090B] border border-[#27272A] text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-300">Email Address</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full mt-1 p-2 text-xs rounded-[10px] bg-[#09090B] border border-[#27272A] text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-300">Account Role</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="w-full mt-1 p-2 text-xs rounded-[10px] bg-[#09090B] border border-[#27272A] text-white font-medium focus:outline-none focus:border-[#22C55E]"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="pt-3 border-t border-[#27272A] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-3 py-1.5 rounded-[10px] text-xs font-medium text-zinc-400 hover:text-white hover:bg-[#1C1C24] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-1.5 rounded-[10px] bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
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
