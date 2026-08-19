import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWebsites } from '../store/websiteSlice';
import ThemeToggle from '../components/ThemeToggle';
import ChatbotGeneratorCard from '../components/ui/ChatbotGeneratorCard';
import WidgetLivePreview from '../components/ui/WidgetLivePreview';
import {
  Bot,
  Globe,
  Palette,
  Eye,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react';

const ChatbotStudio = () => {
  const dispatch = useDispatch();
  const { websites, loading } = useSelector((s) => s.websites);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState(null);
  const [liveConfig, setLiveConfig] = useState(null);

  useEffect(() => { dispatch(fetchWebsites()); }, [dispatch]);

  useEffect(() => {
    if (websites.length > 0 && !selectedWebsiteId) {
      setSelectedWebsiteId(websites[0].id);
    }
  }, [websites, selectedWebsiteId]);

  const selectedWebsite = websites.find((w) => w.id === Number(selectedWebsiteId)) || websites[0];
  const crawlStatus = selectedWebsite?.site?.crawl_status || selectedWebsite?.crawl_status || 'pending';

  const statusConfig = {
    completed: { color: 'bg-emerald-500', text: 'text-emerald-400', label: 'Completed', icon: CheckCircle2 },
    running:   { color: 'bg-blue-500 animate-pulse', text: 'text-blue-400', label: 'Running', icon: Zap },
    pending:   { color: 'bg-amber-500', text: 'text-amber-400', label: 'Pending', icon: Clock },
    failed:    { color: 'bg-red-500', text: 'text-red-400', label: 'Failed', icon: Clock },
  };
  const status = statusConfig[crawlStatus] || statusConfig.pending;

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">

      {/* ─── Top Nav ─────────────────────────────────────────────── */}
      <header className="h-14 shrink-0 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">SiteMind Chatbot Studio</h1>
            <p className="text-[11px] text-zinc-500">Configure &amp; preview your AI widget</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </a>
          <ThemeToggle />
        </div>
      </header>

      {/* ─── Body ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">

        {/* ── Sidebar ── */}
        <aside className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-900 flex flex-col">
          <div className="px-4 pt-5 pb-2">
            <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase mb-3">Your Sites</p>
            <div className="space-y-1">
              {loading && websites.length === 0 ? (
                <p className="text-xs text-zinc-500 px-2 py-3">Loading…</p>
              ) : websites.length === 0 ? (
                <p className="text-xs text-zinc-500 px-2 py-3">No websites found.</p>
              ) : websites.map((w) => {
                const wStatus = w.site?.crawl_status || w.crawl_status || 'pending';
                const isSelected = selectedWebsite?.id === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => setSelectedWebsiteId(w.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                        : 'text-zinc-400 hover:bg-zinc-800 border border-transparent'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs truncate flex-1">{w.domain}</span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      wStatus === 'completed' ? 'bg-emerald-500' :
                      wStatus === 'running' ? 'bg-blue-400 animate-pulse' : 'bg-amber-400'
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>

          {selectedWebsite && (
            <div className="px-4 pt-5 border-t border-zinc-800 mt-4">
              <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase mb-3">Studio</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  <Palette className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Branding</span>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-zinc-500">
                  <Eye className="w-3.5 h-3.5" />
                  <span className="text-xs">Live Preview →</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-auto p-4 border-t border-zinc-800">
            <p className="text-[10px] text-zinc-600 leading-relaxed">Widget runs in a Shadow DOM — host styles cannot interfere.</p>
          </div>
        </aside>

        {/* ── Main Content ── */}
        {selectedWebsite ? (
          <div className="flex-1 flex flex-col min-w-0">

            {/* Page Header */}
            <div className="shrink-0 border-b border-zinc-800 bg-zinc-900/60 px-8 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">{selectedWebsite.domain}</h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-medium">Verified</span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">Chatbot branding, palette overrides &amp; embed token</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Knowledge Base:</span>
                <span className={`flex items-center gap-1.5 text-xs font-semibold ${status.text}`}>
                  <span className={`w-2 h-2 rounded-full ${status.color}`} />
                  {status.label}
                </span>
              </div>
            </div>

            {/* Two-column: Config Left | Preview Right */}
            <div className="flex-1 flex min-h-0 overflow-hidden">

              {/* Config Panel */}
              <div className="flex-1 overflow-y-auto p-6 min-w-0">
                <ChatbotGeneratorCard
                  website={selectedWebsite}
                  onConfigChange={(cfg) => setLiveConfig(cfg)}
                />
              </div>

              {/* Live Preview Panel */}
              <div className="w-[420px] shrink-0 border-l border-zinc-800 bg-zinc-900/40 flex flex-col">
                <div className="shrink-0 px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-white">Live Preview</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Real-time
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-5 flex items-start">
                  <WidgetLivePreview
                    themeColor={liveConfig?.theme_color || '#22C55E'}
                    backgroundColor={liveConfig?.background_color || '#ffffff'}
                    textColor={liveConfig?.text_color || '#111111'}
                    logoUrl={liveConfig?.logo_url}
                    websiteName={
                      selectedWebsite.domain
                        ? selectedWebsite.domain.split('.')[0].toUpperCase()
                        : 'SiteMind AI'
                    }
                    domain={selectedWebsite.domain}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
            Select a website from the sidebar.
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatbotStudio;
