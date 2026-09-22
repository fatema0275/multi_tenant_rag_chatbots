import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Search, Check, Plus, X, ArrowRight } from 'lucide-react';
import { useActiveWebsite } from '../../context/ActiveWebsiteContext';

import { getSiteDisplayName } from '../../layouts/DashboardLayout';

const getStatusColor = (w) => {
  const crawl = w?.site?.crawl_status || w?.crawl_status || 'pending';
  if (crawl === 'completed' || w?.verification_status === 'verified') return 'bg-[#22C55E]';
  if (crawl === 'running' || crawl === 'crawling' || crawl === 'pending') return 'bg-amber-400 animate-pulse';
  if (crawl === 'failed' || crawl === 'cancelled') return 'bg-red-400';
  return 'bg-[#22C55E]';
};

const WebsiteSwitcherModal = ({ isOpen, onClose, onOpenAddSite }) => {
  const { websites, activeWebsiteId, setActiveWebsiteId } = useActiveWebsite();
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return websites;
    return websites.filter((w) => w.domain?.toLowerCase().includes(query) || getSiteDisplayName(w).toLowerCase().includes(query));
  }, [websites, search]);

  const handleSelect = (id) => {
    setActiveWebsiteId(id);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-lg bg-[#131318] border border-[#27272A] rounded-[18px] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[70vh]"
          >
            {/* Header & Search */}
            <div className="p-4 border-b border-[#27272A] flex items-center gap-3">
              <Search className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Switch active website... (search domain)"
                className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
              />
              <span className="text-[10px] font-mono text-zinc-400 bg-[#27272A] px-1.5 py-0.5 rounded">
                ESC
              </span>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 divide-y divide-[#27272A]/50">
              {filtered.length === 0 ? (
                <div className="py-8 text-center space-y-1">
                  <p className="font-heading font-semibold text-xs text-zinc-200">
                    {websites.length === 0 ? "You haven't added any websites yet." : "No matching websites found."}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {websites.length === 0 ? "Add your first website to get started." : "Try clearing your search query."}
                  </p>
                </div>
              ) : (
                filtered.map((site) => {
                  const isActive = site.id === activeWebsiteId;
                  const dotClass = getStatusColor(site);
                  const displayName = getSiteDisplayName(site);
                  return (
                    <button
                      key={site.id}
                      onClick={() => handleSelect(site.id)}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-[12px] text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#22C55E]/10 border border-[#22C55E]/25 text-[#22C55E]'
                          : 'text-zinc-300 hover:bg-[#27272A]/40 hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-heading font-semibold truncate text-white">
                            {displayName}
                          </p>
                          <p className="text-[11px] text-zinc-400 truncate">
                            {site.domain} · {site.verification_status === 'verified' ? 'Verified Domain' : 'Attested'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isActive && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#22C55E] bg-[#22C55E]/15 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                        {!isActive && (
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-500 opacity-0 group-hover:opacity-100" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[#27272A] bg-[#09090B]/50 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">
                Press <kbd className="font-mono bg-[#27272A] text-zinc-300 px-1 py-0.5 rounded text-[10px]">W</kbd> anywhere to open
              </span>
              {onOpenAddSite && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAddSite();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Website
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WebsiteSwitcherModal;
