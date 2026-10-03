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
    <div className="bg-[#131318] border border-[#27272A] p-2.5 rounded-[12px] shadow-xl text-xs space-y-1">
      <div className="text-zinc-400 font-medium">{label}</div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
        <span className="font-semibold text-white tabular-nums">
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

  const { metrics = {}, users = [], daily_registrations = [] } = data || {};

  // Search filtering
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        (u.name && u.name.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  // Pagination (25 rows per page)
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-28 rounded-[16px]" />
          ))}
        </div>
        <SkeletonBlock className="h-96 rounded-[16px]" />
        <SkeletonBlock className="h-64 rounded-[16px]" />
      </div>
    );
  }

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
    <div className="space-y-6">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#131318] border border-[#27272A] p-5 rounded-[16px] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-zinc-400">
              Total Registered Users
            </div>
            <div className="text-2xl lg:text-3xl font-bold tracking-tight text-white tabular-nums mt-1">
              {metrics.total_users?.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">Platform-wide tenants</div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-[#1C1C24] text-zinc-300 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
        </div>

        <div className="bg-[#131318] border border-[#27272A] p-5 rounded-[16px] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-zinc-400">
              New Users This Week
            </div>
            <div className="text-2xl lg:text-3xl font-bold tracking-tight text-emerald-400 tabular-nums mt-1">
              +{metrics.new_users_week?.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">Last 7 calendar days</div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-[#1C1C24] text-zinc-300 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="bg-[#131318] border border-[#27272A] p-5 rounded-[16px] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-zinc-400">
              New Users This Month
            </div>
            <div className="text-2xl lg:text-3xl font-bold tracking-tight text-purple-400 tabular-nums mt-1">
              +{metrics.new_users_month?.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">Last 30 calendar days</div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-[#1C1C24] text-zinc-300 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-purple-400" />
          </div>
        </div>

        <div className="bg-[#131318] border border-[#27272A] p-5 rounded-[16px] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-zinc-400">
              Active Users (7 Days)
            </div>
            <div className="text-2xl lg:text-3xl font-bold tracking-tight text-white tabular-nums mt-1">
              {metrics.active_users?.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">Active query activity</div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-[#1C1C24] text-zinc-300 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-[#22C55E]" />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#131318] border border-[#27272A] rounded-[16px] overflow-hidden">
        <div className="p-5 border-b border-[#27272A] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Registered Tenant Accounts
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage platform users, roles, websites owned, and account states.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search user name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[10px] bg-[#09090B] border border-[#27272A] text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#22C55E]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#27272A] bg-[#0E0E12] text-zinc-400 font-medium">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4">Websites</th>
                <th className="py-3 px-4">Total Queries</th>
                <th className="py-3 px-4">Last Active</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]/50 text-zinc-300">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500">
                    No users matching your search query.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#181820] transition-colors">
                    <td className="py-3.5 px-4 font-medium text-white">
                      {u.name}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-[6px] text-[11px] font-medium capitalize border ${
                        u.role === 'admin'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-zinc-800 text-zinc-300 border-zinc-750'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-zinc-400">
                      {u.registered_date ? new Date(u.registered_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setSelectedUserSites(u)}
                        className="px-2.5 py-1 rounded-[6px] bg-[#09090B] border border-[#27272A] hover:border-[#22C55E]/50 text-zinc-300 text-xs transition-colors cursor-pointer"
                      >
                        {u.website_count} {u.website_count === 1 ? 'site' : 'sites'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 tabular-nums text-zinc-300">
                      {u.total_queries.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-zinc-400">
                      {u.last_active ? new Date(u.last_active).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-[6px] text-[11px] font-medium capitalize border ${
                        u.account_status === 'suspended'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {u.account_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditRole(u)}
                          title="Edit Role"
                          className="p-1.5 rounded-[8px] text-zinc-400 hover:text-white hover:bg-[#1C1C24] transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onToggleSuspendUser(u.id)}
                          title={u.account_status === 'suspended' ? 'Activate Account' : 'Suspend Account'}
                          className={`p-1.5 rounded-[8px] transition-colors cursor-pointer ${
                            u.account_status === 'suspended'
                              ? 'text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-amber-400 hover:bg-amber-500/10'
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
                          className="p-1.5 rounded-[8px] text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
        <div className="p-4 border-t border-[#27272A] flex items-center justify-between text-xs text-zinc-400">
          <span>
            Showing {filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} users
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-[8px] border border-[#27272A] disabled:opacity-30 hover:bg-[#1C1C24] text-zinc-300 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-medium text-white px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-[8px] border border-[#27272A] disabled:opacity-30 hover:bg-[#1C1C24] text-zinc-300 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bar Chart: Daily User Registrations */}
      <div className="bg-[#131318] border border-[#27272A] p-6 rounded-[16px]">
        <div className="mb-5">
          <h3 className="text-base font-bold text-white tracking-tight">
            Daily New User Registrations
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Account acquisition velocity for the selected range.
          </p>
        </div>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily_registrations} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272A" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#71717A' }}
                tickFormatter={(val) => {
                  if (!val) return '';
                  const parts = val.split('-');
                  return `${parts[1]}/${parts[2]}`;
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#71717A' }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar
                dataKey="count"
                fill="#22C55E"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* View Websites Modal */}
      {selectedUserSites && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#131318] border border-[#27272A] rounded-[16px] w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Websites for {selectedUserSites.email}
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Total domains: {selectedUserSites.websites?.length || 0}
                </p>
              </div>
              <button
                onClick={() => setSelectedUserSites(null)}
                className="p-1.5 rounded-[8px] text-zinc-400 hover:text-white hover:bg-[#1C1C24] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-2 max-h-60 overflow-y-auto">
              {(!selectedUserSites.websites || selectedUserSites.websites.length === 0) ? (
                <div className="text-center py-6 text-xs text-zinc-500">
                  No websites registered by this user yet.
                </div>
              ) : (
                selectedUserSites.websites.map((site) => (
                  <div key={site.id} className="p-3 rounded-[10px] bg-[#09090B] border border-[#27272A] flex items-center justify-between text-xs">
                    <span className="font-medium text-white">
                      {site.domain}
                    </span>
                    <span className="px-2 py-0.5 rounded-[6px] text-[11px] font-medium capitalize border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      {site.status}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="pt-3 border-t border-[#27272A] flex justify-end">
              <button
                onClick={() => setSelectedUserSites(null)}
                className="px-4 py-2 rounded-[10px] bg-[#27272A] hover:bg-[#323238] text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editRoleUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#131318] border border-[#27272A] rounded-[16px] w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <h4 className="text-sm font-bold text-white">
                Edit Role for {editRoleUser.email}
              </h4>
              <button
                onClick={() => setEditRoleUser(null)}
                className="p-1.5 rounded-[8px] text-zinc-400 hover:text-white hover:bg-[#1C1C24] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-3">
              <label className="text-xs font-medium text-zinc-300">
                Select Account Role:
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full p-2.5 text-xs rounded-[10px] bg-[#09090B] border border-[#27272A] text-white font-medium focus:outline-none focus:border-[#22C55E]"
              >
                <option value="user">User (Standard tenant privilege)</option>
                <option value="admin">Admin (Full platform-wide privileges)</option>
              </select>
            </div>
            <div className="pt-3 border-t border-[#27272A] flex justify-end gap-2">
              <button
                onClick={() => setEditRoleUser(null)}
                className="px-3 py-1.5 rounded-[10px] text-xs font-medium text-zinc-400 hover:text-white hover:bg-[#1C1C24] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEditRole}
                className="px-4 py-1.5 rounded-[10px] bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-semibold transition-colors shadow-xs"
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
