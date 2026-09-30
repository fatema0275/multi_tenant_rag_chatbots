import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  Users,
  UserPlus,
  Calendar,
  Activity,
  Search,
  ShieldCheck,
  ShieldAlert,
  Edit2,
  Trash2,
  PauseCircle,
  PlayCircle,
  Globe,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import SkeletonBlock from '../ui/SkeletonBlock';

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl shadow-xl text-xs">
      <div className="font-semibold text-zinc-500 dark:text-zinc-400 mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-accent" />
        <span className="font-bold text-zinc-900 dark:text-white tabular-nums">
          {payload[0].value} New Registrations
        </span>
      </div>
    </div>
  );
};

const UserActivityTab = ({
  data,
  loading,
  onEditRole,
  onToggleSuspendUser,
  onDeleteUser
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Modals state
  const [selectedUserSites, setSelectedUserSites] = useState(null);
  const [editRoleUser, setEditRoleUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('user');

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <SkeletonBlock className="h-96 rounded-2xl" />
        <SkeletonBlock className="h-64 rounded-2xl" />
      </div>
    );
  }

  const { metrics = {}, users = [], daily_registrations = [] } = data;

  // Search filtering
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.name && u.name.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  // Pagination (25 rows per page)
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage]);

  const handleOpenEditRole = (u) => {
    setEditRoleUser(u);
    setSelectedRole(u.role || 'user');
  };

  const handleConfirmEditRole = () => {
    if (editRoleUser) {
      onEditRole(editRoleUser.id, selectedRole);
      setEditRoleUser(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-5 rounded-[20px] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-txt-secondary-light dark:text-txt-secondary-dark">
              Total Registered Users
            </div>
            <div className="text-2xl font-heading font-extrabold text-zinc-900 dark:text-white tabular-nums mt-1">
              {metrics.total_users?.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Platform-wide tenants</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-5 rounded-[20px] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-txt-secondary-light dark:text-txt-secondary-dark">
              New Users This Week
            </div>
            <div className="text-2xl font-heading font-extrabold text-accent tabular-nums mt-1">
              +{metrics.new_users_week?.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Last 7 calendar days</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-5 rounded-[20px] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-txt-secondary-light dark:text-txt-secondary-dark">
              New Users This Month
            </div>
            <div className="text-2xl font-heading font-extrabold text-purple-500 tabular-nums mt-1">
              +{metrics.new_users_month?.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Last 30 calendar days</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-5 rounded-[20px] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-txt-secondary-light dark:text-txt-secondary-dark">
              Active Users (7 Days)
            </div>
            <div className="text-2xl font-heading font-extrabold text-emerald-500 tabular-nums mt-1">
              {metrics.active_users?.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Active query activity</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark rounded-[22px] overflow-hidden shadow-xs">
        <div className="p-5 border-b border-zinc-200/80 dark:border-border-dark flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-base font-bold text-zinc-900 dark:text-white">
              Registered Tenant Accounts
            </h3>
            <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
              Manage platform users, roles, websites owned, and account states.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary-light dark:text-txt-secondary-dark" />
            <input
              type="text"
              placeholder="Search user name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-border-dark text-zinc-900 dark:text-white focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200/80 dark:border-border-dark bg-zinc-50/75 dark:bg-surface-dark/75 text-txt-secondary-light dark:text-txt-secondary-dark">
                <th className="py-3 px-4 font-bold">Name</th>
                <th className="py-3 px-4 font-bold">Email</th>
                <th className="py-3 px-4 font-bold">Role</th>
                <th className="py-3 px-4 font-bold">Registered Date</th>
                <th className="py-3 px-4 font-bold">Websites</th>
                <th className="py-3 px-4 font-bold">Total Queries</th>
                <th className="py-3 px-4 font-bold">Last Active</th>
                <th className="py-3 px-4 font-bold">Account Status</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-txt-secondary-light dark:text-txt-secondary-dark">
                    No users matching your search query.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-white">
                      {u.name}
                    </td>
                    <td className="py-3.5 px-4 text-txt-secondary-light dark:text-txt-secondary-dark font-mono">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'admin'
                          ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">
                      {u.registered_date ? new Date(u.registered_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setSelectedUserSites(u)}
                        className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-accent/15 hover:text-accent font-semibold font-mono text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                      >
                        {u.website_count} {u.website_count === 1 ? 'site' : 'sites'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                      {u.total_queries.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">
                      {u.last_active ? new Date(u.last_active).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.account_status === 'suspended'
                          ? 'bg-rose-500/10 text-rose-500'
                          : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {u.account_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditRole(u)}
                          title="Edit Role"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onToggleSuspendUser(u.id)}
                          title={u.account_status === 'suspended' ? 'Activate Account' : 'Suspend Account'}
                          className={`p-1.5 rounded-lg cursor-pointer ${
                            u.account_status === 'suspended'
                              ? 'text-emerald-500 hover:bg-emerald-500/10'
                              : 'text-amber-500 hover:bg-amber-500/10'
                          }`}
                        >
                          {u.account_status === 'suspended' ? (
                            <PlayCircle className="w-3.5 h-3.5" />
                          ) : (
                            <PauseCircle className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => onDeleteUser(u.id, u.email)}
                          title="Delete Account"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (25 rows per page) */}
        <div className="p-4 border-t border-zinc-200/80 dark:border-border-dark flex items-center justify-between text-xs text-txt-secondary-light dark:text-txt-secondary-dark">
          <span>
            Showing {filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} users
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-border-dark disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-bold text-zinc-900 dark:text-white">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-border-dark disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bar Chart: Daily User Registrations */}
      <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-6 rounded-[22px] shadow-xs">
        <div className="mb-4">
          <h3 className="font-heading text-base font-bold text-zinc-900 dark:text-white">
            Daily New User Registrations
          </h3>
          <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
            Account acquisition velocity for the selected range.
          </p>
        </div>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily_registrations} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
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
              <Tooltip content={<CustomBarTooltip />} />
              <Bar
                dataKey="count"
                fill="#22C55E"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* View Websites Modal */}
      {selectedUserSites && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111115] border border-zinc-200 dark:border-border-dark rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-border-dark">
              <div>
                <h4 className="font-heading text-sm font-bold text-zinc-900 dark:text-white">
                  Websites for {selectedUserSites.email}
                </h4>
                <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
                  Total domains: {selectedUserSites.websites?.length || 0}
                </p>
              </div>
              <button
                onClick={() => setSelectedUserSites(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-2 max-h-60 overflow-y-auto">
              {(!selectedUserSites.websites || selectedUserSites.websites.length === 0) ? (
                <div className="text-center py-6 text-xs text-txt-secondary-light dark:text-txt-secondary-dark">
                  No websites registered by this user yet.
                </div>
              ) : (
                selectedUserSites.websites.map((site) => (
                  <div key={site.id} className="p-2.5 rounded-xl bg-zinc-50 dark:bg-surface-dark border border-zinc-200/60 dark:border-border-dark flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {site.domain}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-500">
                      {site.status}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="pt-3 border-t border-zinc-200 dark:border-border-dark flex justify-end">
              <button
                onClick={() => setSelectedUserSites(null)}
                className="px-4 py-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editRoleUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111115] border border-zinc-200 dark:border-border-dark rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-border-dark">
              <h4 className="font-heading text-sm font-bold text-zinc-900 dark:text-white">
                Edit Role for {editRoleUser.email}
              </h4>
              <button
                onClick={() => setEditRoleUser(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-3">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Select Account Role:
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-surface-dark border border-zinc-200 dark:border-border-dark text-zinc-900 dark:text-white font-semibold"
              >
                <option value="user">User (Standard tenant privilege)</option>
                <option value="admin">Admin (Full platform-wide privileges)</option>
              </select>
            </div>
            <div className="pt-3 border-t border-zinc-200 dark:border-border-dark flex justify-end gap-2">
              <button
                onClick={() => setEditRoleUser(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEditRole}
                className="px-4 py-1.5 rounded-xl bg-accent text-zinc-950 text-xs font-bold shadow-md shadow-accent/20"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserActivityTab;
