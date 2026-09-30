import React, { useState, useMemo } from 'react';
import {
  Search,
  Globe,
  RotateCw,
  Eye,
  Trash2,
  PauseCircle,
  PlayCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Layers
} from 'lucide-react';
import SkeletonBlock from '../ui/SkeletonBlock';
import WebsiteDetailDrawer from './WebsiteDetailDrawer';

const WebsiteHealthTab = ({
  data,
  loading,
  onTriggerCrawl,
  onToggleSuspend,
  onDeleteWebsite
}) => {
  const [filterPill, setFilterPill] = useState('all'); // 'all' | 'needs_attention' | 'active' | 'inactive'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const [selectedWebsite, setSelectedWebsite] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const websites = data?.websites || [];
  const detailsMap = data?.details || {};

  // Filtering
  const filteredWebsites = useMemo(() => {
    let result = websites;

    // Filter pill
    if (filterPill === 'needs_attention') {
      result = result.filter((w) => w.filters?.needs_attention);
    } else if (filterPill === 'active') {
      result = result.filter((w) => w.filters?.active);
    } else if (filterPill === 'inactive') {
      result = result.filter((w) => w.filters?.inactive);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (w) =>
          w.domain.toLowerCase().includes(q) ||
          w.owner_email.toLowerCase().includes(q)
      );
    }

    // Sorting
    return [...result].sort((a, b) => {
      let vA = a[sortField];
      let vB = b[sortField];
      if (typeof vA === 'string') vA = vA.toLowerCase();
      if (typeof vB === 'string') vB = vB.toLowerCase();
      if (vA < vB) return sortAsc ? -1 : 1;
      if (vA > vB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [websites, filterPill, searchQuery, sortField, sortAsc]);

  // Pagination (25 rows per page)
  const totalPages = Math.ceil(filteredWebsites.length / pageSize) || 1;
  const paginatedWebsites = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredWebsites.slice(start, start + pageSize);
  }, [filteredWebsites, currentPage]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const openDrawer = (website) => {
    setSelectedWebsite(website);
    setIsDrawerOpen(true);
  };

  if (loading && websites.length === 0) {
    return (
      <div className="space-y-4">
        <SkeletonBlock className="h-14 rounded-2xl" />
        <SkeletonBlock className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Pills & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark p-4 rounded-[20px] shadow-xs">
        {/* Four Filter Pills */}
        <div className="flex p-1 rounded-xl bg-zinc-100 dark:bg-[#18181B] border border-zinc-200 dark:border-border-dark w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: `All (${websites.length})` },
            { id: 'needs_attention', label: `Needs Attention (${websites.filter(w => w.filters?.needs_attention).length})`, color: 'text-amber-500' },
            { id: 'active', label: `Active (${websites.filter(w => w.filters?.active).length})` },
            { id: 'inactive', label: `Inactive (${websites.filter(w => w.filters?.inactive).length})` },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => {
                setFilterPill(pill.id);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                filterPill === pill.id
                  ? 'bg-white dark:bg-surface-dark text-zinc-900 dark:text-white shadow-xs'
                  : 'text-txt-secondary-light dark:text-txt-secondary-dark hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <span className={pill.color || ''}>{pill.label}</span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary-light dark:text-txt-secondary-dark" />
          <input
            type="text"
            placeholder="Search domain or owner..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-[#18181B] border border-zinc-200 dark:border-border-dark text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Main Sortable Table */}
      <div className="bg-white dark:bg-surface-dark border border-zinc-200/80 dark:border-border-dark rounded-[22px] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200/80 dark:border-border-dark bg-zinc-50/75 dark:bg-surface-dark/75 text-txt-secondary-light dark:text-txt-secondary-dark select-none">
                <th onClick={() => handleSort('domain')} className="py-3 px-4 font-bold cursor-pointer hover:text-zinc-900 dark:hover:text-white">
                  <div className="flex items-center gap-1.5">
                    <span>Domain</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th onClick={() => handleSort('owner_email')} className="py-3 px-4 font-bold cursor-pointer hover:text-zinc-900 dark:hover:text-white">
                  <div className="flex items-center gap-1.5">
                    <span>Owner Email</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 font-bold">Verification</th>
                <th className="py-3 px-4 font-bold">Crawl Status</th>
                <th className="py-3 px-4 font-bold">Chatbot Status</th>
                <th onClick={() => handleSort('total_chunks')} className="py-3 px-4 font-bold cursor-pointer hover:text-zinc-900 dark:hover:text-white">
                  <div className="flex items-center gap-1.5">
                    <span>Chunks</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th onClick={() => handleSort('total_queries')} className="py-3 px-4 font-bold cursor-pointer hover:text-zinc-900 dark:hover:text-white">
                  <div className="flex items-center gap-1.5">
                    <span>Queries</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th onClick={() => handleSort('fallback_rate')} className="py-3 px-4 font-bold cursor-pointer hover:text-zinc-900 dark:hover:text-white">
                  <div className="flex items-center gap-1.5">
                    <span>Fallback Rate</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th onClick={() => handleSort('last_crawl_date')} className="py-3 px-4 font-bold cursor-pointer hover:text-zinc-900 dark:hover:text-white">
                  <div className="flex items-center gap-1.5">
                    <span>Last Crawl</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th onClick={() => handleSort('last_query_date')} className="py-3 px-4 font-bold cursor-pointer hover:text-zinc-900 dark:hover:text-white">
                  <div className="flex items-center gap-1.5">
                    <span>Last Query</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {paginatedWebsites.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-txt-secondary-light dark:text-txt-secondary-dark">
                    No websites match your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedWebsites.map((site) => (
                  <tr
                    key={site.id}
                    onClick={() => openDrawer(site)}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-accent shrink-0" />
                      <span className="truncate max-w-[160px] group-hover:text-accent transition-colors">
                        {site.domain}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-txt-secondary-light dark:text-txt-secondary-dark truncate max-w-[160px]">
                      {site.owner_email}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        site.verification_status === 'verified'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {site.verification_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        site.crawl_status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : site.crawl_status === 'failed'
                          ? 'bg-rose-500/10 text-rose-500'
                          : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {site.crawl_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        site.chatbot_status === 'active'
                          ? 'bg-accent/10 text-accent'
                          : site.chatbot_status === 'suspended'
                          ? 'bg-rose-500/10 text-rose-500'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                      }`}>
                        {site.chatbot_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                      {site.total_chunks.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                      {site.total_queries.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums font-bold">
                      <span className={site.fallback_rate > 40 ? 'text-rose-500' : 'text-emerald-500'}>
                        {site.fallback_rate}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">
                      {site.last_crawl_date ? new Date(site.last_crawl_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">
                      {site.last_query_date ? new Date(site.last_query_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDrawer(site)}
                          title="View Details"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onTriggerCrawl(site.id)}
                          title="Force Re-crawl"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-accent hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onToggleSuspend(site.id)}
                          title={site.is_suspended ? 'Unsuspend Chatbot' : 'Suspend Chatbot'}
                          className={`p-1.5 rounded-lg cursor-pointer ${
                            site.is_suspended
                              ? 'text-emerald-500 hover:bg-emerald-500/10'
                              : 'text-amber-500 hover:bg-amber-500/10'
                          }`}
                        >
                          {site.is_suspended ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => onDeleteWebsite(site.id, site.domain)}
                          title="Delete Website"
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
            Showing {filteredWebsites.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredWebsites.length)} of {filteredWebsites.length} websites
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

      {/* Website Detail Drawer */}
      <WebsiteDetailDrawer
        website={selectedWebsite}
        detail={selectedWebsite ? detailsMap[selectedWebsite.id] : null}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onTriggerCrawl={onTriggerCrawl}
      />
    </div>
  );
};

export default WebsiteHealthTab;
