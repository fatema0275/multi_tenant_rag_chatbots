import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useActiveWebsite } from '../context/ActiveWebsiteContext';
import { triggerCrawl } from '../store/websiteSlice';
import WidgetLivePreview from '../components/ui/WidgetLivePreview';
import SkeletonBlock from '../components/ui/SkeletonBlock';
import ConfirmModal from '../components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import {
  Bot,
  Palette,
  Sliders,
  Code,
  BookOpen,
  RefreshCw,
  Eye,
  Lock,
  Unlock,
  Copy,
  Check,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Loader2,
  ShieldAlert,
  Globe,
  Monitor,
  Smartphone,
  Zap,
} from 'lucide-react';

const ChatbotStudio = () => {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);
  const { activeWebsite, websites, setActiveWebsiteId } = useActiveWebsite();

  // Studio Active Tab
  const [activeTab, setActiveTab] = useState('branding');

  // Config State
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Live Colors & Branding
  const [themeColor, setThemeColor] = useState('#22C55E');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#111111');
  const [overridesLocked, setOverridesLocked] = useState(false);

  // Widget Settings
  const [chatbotName, setChatbotName] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [placeholderText, setPlaceholderText] = useState('Type a message…');
  const [widgetPosition, setWidgetPosition] = useState('bottom-right');

  // Device Preview Mode
  const [deviceMode, setDeviceMode] = useState('desktop');

  // Modals
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [deleteKnowledgeId, setDeleteKnowledgeId] = useState(null);

  // Sync log & status
  const [syncJobs, setSyncJobs] = useState([]);
  const [loadingSync, setLoadingSync] = useState(false);
  const [syncSearch, setSyncSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Manual Knowledge
  const [knowledgeList, setKnowledgeList] = useState(() => {
    const saved = localStorage.getItem(`sitemind_knowledge_${activeWebsite?.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return [
      {
        id: 1,
        title: 'Business Hours',
        content: 'Monday - Friday: 9:00 AM - 6:00 PM EST. Weekend support via email.',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        title: 'Pricing & Plans',
        content: 'Free starter tier available with 1,000 monthly tokens. Pro starts at $49/month.',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 3,
        title: 'Contact Information',
        content: 'Support email: support@sitemind.io. Phone: +1 (800) 555-0199.',
        updatedAt: new Date().toISOString(),
      },
    ];
  });
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [editingKnowledge, setEditingKnowledge] = useState(null);
  const [knowledgeForm, setKnowledgeForm] = useState({ title: '', content: '' });
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);

  // Load configuration for active website
  useEffect(() => {
    if (!activeWebsite?.id || !token) return;

    setLoadingConfig(true);
    fetch(`/api/chatbot/config/${activeWebsite.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error && data.exists !== false) {
          setConfig(data);
          setThemeColor(data.theme_color || '#22C55E');
          setBackgroundColor(data.background_color || '#ffffff');
          setTextColor(data.text_color || '#111111');
          setOverridesLocked(Boolean(data.overrides_locked));

          const ws = data.widget_settings || {};
          setChatbotName(ws.chatbot_name || (activeWebsite.domain ? activeWebsite.domain.split('.')[0].toUpperCase() : 'SiteMind AI'));
          setWelcomeMessage(ws.welcome_message || `Hello! Welcome to ${activeWebsite.domain || 'our site'}. How can I assist you today?`);
          setPlaceholderText(ws.placeholder_text || 'Type a message…');
          setWidgetPosition(ws.position || 'bottom-right');
        } else {
          setConfig(null);
        }
      })
      .catch(() => setConfig(null))
      .finally(() => setLoadingConfig(false));
  }, [activeWebsite?.id, token]);

  // Load sync crawl jobs
  useEffect(() => {
    if (!activeWebsite?.id || !token) return;
    setLoadingSync(true);
    fetch(`/api/websites/${activeWebsite.id}/crawl-jobs`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setSyncJobs(Array.isArray(data) ? data : []))
      .catch(() => setSyncJobs([]))
      .finally(() => setLoadingSync(false));
  }, [activeWebsite?.id, token]);

  // Save knowledge to local storage on change
  useEffect(() => {
    if (activeWebsite?.id) {
      localStorage.setItem(`sitemind_knowledge_${activeWebsite.id}`, JSON.stringify(knowledgeList));
    }
  }, [knowledgeList, activeWebsite?.id]);

  const handleGenerate = async () => {
    if (!activeWebsite?.id || !token) return;
    const canGenerate = crawlStatus === 'completed' || crawlStatus === 'cancelled' || (activeWebsite?.tokens_used && activeWebsite.tokens_used > 0);
    if (!canGenerate && crawlStatus === 'pending') {
      toast.error(`Cannot generate chatbot: website crawl has not been run yet. Please start a crawl first.`);
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/chatbot/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ website_id: activeWebsite.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to generate chatbot configuration');
      } else {
        setConfig(data);
        setThemeColor(data.theme_color || '#22C55E');
        setBackgroundColor(data.background_color || '#ffffff');
        setTextColor(data.text_color || '#111111');
        toast.success('Chatbot branding generated successfully!');
      }
    } catch {
      toast.error('Network error during branding generation.');
    } finally {
      setGenerating(false);
      setShowRegenModal(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!activeWebsite?.id || !token) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/chatbot/config/${activeWebsite.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          theme_color: themeColor,
          background_color: backgroundColor,
          text_color: textColor,
          widget_settings: {
            chatbot_name: chatbotName,
            welcome_message: welcomeMessage,
            placeholder_text: placeholderText,
            position: widgetPosition,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save branding overrides');
      } else {
        setConfig(data);
        setOverridesLocked(true);
        toast.success('Branding & colors saved and locked!');
      }
    } catch {
      toast.error('Network error while saving branding.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWidgetSettings = async () => {
    if (!activeWebsite?.id || !token) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/chatbot/config/${activeWebsite.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          theme_color: themeColor,
          background_color: backgroundColor,
          text_color: textColor,
          widget_settings: {
            chatbot_name: chatbotName,
            welcome_message: welcomeMessage,
            placeholder_text: placeholderText,
            position: widgetPosition,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to update widget settings');
      } else {
        setConfig(data);
        toast.success('Widget settings updated successfully!');
      }
    } catch {
      toast.error('Network error while saving widget settings.');
    } finally {
      setSaving(false);
    }
  };

  const baseUrl =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? `${window.location.protocol}//${window.location.hostname}:5000`
      : window.location.origin;

  const embedScriptTag = config?.embed_token
    ? `<script src="${baseUrl}/static/widget-v1.js" data-token="${config.embed_token}"></script>`
    : `<script src="${baseUrl}/static/widget-v1.js" data-token="YOUR_EMBED_TOKEN"></script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedScriptTag);
    setCopied(true);
    toast.success('Embed script copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncNow = async () => {
    if (!activeWebsite?.id) return;
    setIsSyncing(true);
    const res = await dispatch(triggerCrawl(activeWebsite.id));
    setIsSyncing(false);
    if (triggerCrawl.fulfilled.match(res)) {
      toast.success('Knowledge Base sync crawl started!');
      // Re-fetch jobs
      fetch(`/api/websites/${activeWebsite.id}/crawl-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setSyncJobs(Array.isArray(d) ? d : []));
    } else {
      toast.error(res.payload || 'Failed to start sync crawl.');
    }
  };

  // Knowledge list actions
  const handleSaveKnowledge = (e) => {
    e.preventDefault();
    if (!knowledgeForm.title.trim() || !knowledgeForm.content.trim()) return;

    if (editingKnowledge) {
      setKnowledgeList((prev) =>
        prev.map((item) =>
          item.id === editingKnowledge.id
            ? { ...item, ...knowledgeForm, updatedAt: new Date().toISOString() }
            : item
        )
      );
      toast.success('Knowledge entry updated');
    } else {
      const newEntry = {
        id: Date.now(),
        title: knowledgeForm.title.trim(),
        content: knowledgeForm.content.trim(),
        updatedAt: new Date().toISOString(),
      };
      setKnowledgeList((prev) => [newEntry, ...prev]);
      toast.success('Manual knowledge entry added');
    }

    setEditingKnowledge(null);
    setKnowledgeForm({ title: '', content: '' });
    setShowKnowledgeModal(false);
  };

  const handleDeleteKnowledge = () => {
    if (!deleteKnowledgeId) return;
    setKnowledgeList((prev) => prev.filter((k) => k.id !== deleteKnowledgeId));
    setDeleteKnowledgeId(null);
    toast.success('Knowledge entry removed');
  };

  const filteredKnowledge = useMemo(() => {
    if (!knowledgeSearch.trim()) return knowledgeList;
    const q = knowledgeSearch.toLowerCase();
    return knowledgeList.filter(
      (k) => k.title.toLowerCase().includes(q) || k.content.toLowerCase().includes(q)
    );
  }, [knowledgeList, knowledgeSearch]);

  const filteredSyncJobs = useMemo(() => {
    if (!syncSearch.trim()) return syncJobs;
    const q = syncSearch.toLowerCase();
    return syncJobs.filter(
      (j) => (j.status && j.status.toLowerCase().includes(q)) || (j.crawl_type && j.crawl_type.toLowerCase().includes(q))
    );
  }, [syncJobs, syncSearch]);

  const colorRows = [
    { id: 'theme', label: 'Theme Color', value: themeColor, onChange: setThemeColor },
    { id: 'bg', label: 'Background', value: backgroundColor, onChange: setBackgroundColor },
    { id: 'text', label: 'Text Color', value: textColor, onChange: setTextColor },
  ];

  const tabs = [
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'widget', label: 'Widget Settings', icon: Sliders },
    { id: 'embed', label: 'Embed Code', icon: Code },
    { id: 'knowledge', label: 'Manual Knowledge', icon: BookOpen },
    { id: 'sync', label: 'Sync', icon: RefreshCw },
    // On screens < 1280px, Live Preview appears as a tab
    { id: 'preview', label: 'Live Preview', icon: Eye, mobileOnly: true },
  ];

  if (!activeWebsite) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <Bot className="w-12 h-12 text-zinc-600" />
        <h2 className="font-heading font-bold text-lg text-white">
          No Website Selected
        </h2>
        <p className="text-xs text-zinc-400 max-w-sm">
          Please register or select a website from the navigation to configure its AI Chatbot Studio.
        </p>
      </div>
    );
  }

  const crawlStatus = activeWebsite?.site?.crawl_status || activeWebsite?.crawl_status || 'pending';

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full w-full min-h-0 bg-[#09090B] text-white overflow-hidden">
      {/* ── PANEL 1: Left Fixed Panel (200px) ─────────────────── */}
      <aside className="w-[200px] shrink-0 border-r border-[#27272A] bg-[#131318] flex flex-col h-full overflow-y-auto hidden md:flex">
        {/* Website Context Header */}
        <div className="p-3.5 border-b border-[#27272A] space-y-1 shrink-0">
          <div className="flex items-center gap-1.5">
            <h2 className="font-heading font-bold text-xs text-white truncate flex-1" title={activeWebsite.domain}>
              {activeWebsite.domain}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 shrink-0">
              Verified
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 font-mono">
            tenant_{activeWebsite.id}
          </p>
        </div>

        {/* Vertical Studio Tabs */}
        <div className="py-2 flex-1 space-y-0.5">
          {tabs
            .filter((t) => !t.mobileOnly)
            .map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-left transition-all cursor-pointer ${
                    isActive
                      ? 'border-l-4 border-[#22C55E] bg-[#22C55E]/10 text-white pl-[10px]'
                      : 'text-zinc-400 hover:text-white hover:bg-[#27272A]/30 border-l-4 border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#22C55E]' : 'text-zinc-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
        </div>

        {/* Footer Note */}
        <div className="p-3 border-t border-[#27272A] bg-[#09090B]/30 shrink-0">
          <p className="text-[9.5px] text-zinc-400 leading-relaxed">
            Shadow DOM isolation enabled. Host styles cannot interfere.
          </p>
        </div>
      </aside>

      {/* ── PANEL 2: Center Flex Main Content Area ─────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto p-4 sm:p-5 space-y-3.5">
        {/* Page Title & Subtitle */}
        <div className="space-y-0.5 shrink-0">
          <h1 className="font-heading font-bold text-xl sm:text-2xl text-white tracking-tight">
            Chatbot Studio
          </h1>
          <p className="text-xs text-zinc-400">
            Configure branding, customize conversation options, and inspect live preview.
          </p>
        </div>

        {/* Mobile/Tablet Tab Selector (< 1024px) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:hidden shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#22C55E] text-white'
                    : 'bg-[#131318] text-zinc-400 hover:text-white border border-[#27272A]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Tab 1: Branding ─────────────────────────────────── */}
        {activeTab === 'branding' && (
          <div className="space-y-3.5">
            {crawlStatus === 'pending' ? (
              <div className="p-4 rounded-[14px] bg-amber-500/10 border border-amber-500/20 text-amber-400 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Crawl Required Before Chatbot Generation</h4>
                    <p className="text-[11px] text-amber-400/90">
                      Current status: <strong className="uppercase">{crawlStatus}</strong>. Websites that have not completed crawling cannot generate a chatbot.
                    </p>
                  </div>
                </div>
                <button
                  disabled
                  className="px-4 py-2 rounded-[10px] bg-zinc-800 text-zinc-500 text-xs font-bold transition-all flex items-center gap-1.5 cursor-not-allowed shrink-0 border border-zinc-700 opacity-60"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Crawl Required</span>
                </button>
              </div>
            ) : (
              !config && (
                <div className="p-4 rounded-[14px] bg-[#22C55E]/10 border border-[#22C55E]/20 text-white flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-[#22C55E] shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Chatbot Not Generated Yet</h4>
                      <p className="text-[11px] text-zinc-400">Click Generate Chatbot to extract branding, set default colors, and create your script embed code.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="px-4 py-2 rounded-[10px] bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50 shadow-sm"
                  >
                    {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Generate Chatbot</span>
                  </button>
                </div>
              )
            )}

            {/* Site Name and Logo Display */}
            <div className="rounded-[18px] bg-[#131318] border border-[#27272A] p-4 sm:p-5 space-y-3">
              <h3 className="font-heading font-bold text-xs sm:text-sm text-white">
                Extracted Brand Asset
              </h3>
              <div className="flex items-center gap-3.5 p-3 rounded-[12px] bg-[#09090B] border border-[#27272A]">
                {config?.logo_url ? (
                  <img
                    src={config.logo_url}
                    alt="Logo"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                    className="w-10 h-10 rounded-[10px] object-cover border border-[#27272A]"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center font-bold text-base text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: themeColor }}
                  >
                    {(activeWebsite.domain || 'S')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-white truncate">
                    {activeWebsite.domain}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                    {config?.logo_url ? config.logo_url : 'Auto-generated logo monogram'}
                  </p>
                </div>
              </div>
            </div>

            {/* Color Pickers: Theme Color, Background, Text Color */}
            <div className="rounded-[18px] bg-[#131318] border border-[#27272A] p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-xs sm:text-sm text-white">
                  Color Palette Controls
                </h3>
                {overridesLocked && (
                  <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Locked Overrides
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {colorRows.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-3 p-2.5 rounded-[12px] bg-[#09090B] border border-[#27272A]"
                  >
                    {/* Clickable Swatch */}
                    <div
                      className="w-8 h-8 rounded-[8px] border border-zinc-700 shrink-0 cursor-pointer relative overflow-hidden shadow-sm"
                      style={{ backgroundColor: field.value }}
                      title="Click to choose color"
                    >
                      <input
                        type="color"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                    </div>

                    <span className="text-xs font-semibold text-zinc-200 flex-1">
                      {field.label}
                    </span>

                    {/* Hex Input */}
                    <input
                      type="text"
                      value={field.value.toUpperCase()}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="w-22 px-2 py-1 rounded-[6px] text-xs font-mono text-center bg-[#131318] border border-[#27272A] text-white focus:outline-none focus:border-[#22C55E] transition-colors"
                      style={{ width: '84px' }}
                    />
                  </div>
                ))}
              </div>

              {/* Lock/Unlock Toggle */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-[12px] bg-[#09090B] border border-[#27272A]">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    {overridesLocked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3 text-zinc-400" />}
                    Lock Manual Overrides
                  </span>
                  <p className="text-[10.5px] text-zinc-400 leading-snug">
                    When locked, future re-indexing crawls will not overwrite your colors.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOverridesLocked(!overridesLocked)}
                  className={`px-2.5 py-1 rounded-[8px] text-[11px] font-semibold transition-all cursor-pointer shrink-0 ${
                    overridesLocked
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-zinc-800 text-zinc-300 border border-[#27272A]'
                  }`}
                >
                  {overridesLocked ? 'Locked' : 'Unlocked'}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  onClick={handleSaveBranding}
                  disabled={saving}
                  className="w-full sm:flex-1 py-2 rounded-[10px] bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-sm"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save &amp; Lock Colors
                </button>

                <button
                  onClick={() => (overridesLocked ? setShowRegenModal(true) : handleGenerate())}
                  disabled={generating}
                  className="w-full sm:w-auto px-4 py-2 rounded-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-[#27272A] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-400" />}
                  Regenerate Branding
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: Widget Settings ──────────────────────────── */}
        {activeTab === 'widget' && (
          <div className="rounded-[18px] bg-[#131318] border border-[#27272A] p-6 space-y-5">
            <h3 className="font-heading font-bold text-sm text-white">
              Widget Controls &amp; Positioning
            </h3>

            {/* Chatbot Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Chatbot Display Name
              </label>
              <input
                type="text"
                value={chatbotName}
                onChange={(e) => setChatbotName(e.target.value)}
                placeholder="e.g., SiteMind Assistant"
                className="w-full h-10 px-3.5 rounded-[12px] bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-[#22C55E] transition-colors"
              />
            </div>

            {/* Welcome Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Welcome Message
              </label>
              <textarea
                rows={3}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="Initial message shown when opening chat…"
                className="w-full p-3.5 rounded-[12px] bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-[#22C55E] transition-colors resize-none"
              />
            </div>

            {/* Placeholder Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Input Placeholder Text
              </label>
              <input
                type="text"
                value={placeholderText}
                onChange={(e) => setPlaceholderText(e.target.value)}
                placeholder="Type a message…"
                className="w-full h-10 px-3.5 rounded-[12px] bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-[#22C55E] transition-colors"
              />
            </div>

            {/* Widget Position: bottom-right / bottom-left */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">
                Widget Launch Position
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setWidgetPosition('bottom-right')}
                  className={`py-3 px-4 rounded-[12px] text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    widgetPosition === 'bottom-right'
                      ? 'bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E]'
                      : 'bg-[#09090B] border border-[#27272A] text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current" />
                  Bottom Right (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setWidgetPosition('bottom-left')}
                  className={`py-3 px-4 rounded-[12px] text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    widgetPosition === 'bottom-left'
                      ? 'bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E]'
                      : 'bg-[#09090B] border border-[#27272A] text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current" />
                  Bottom Left
                </button>
              </div>
            </div>

            <button
              onClick={handleSaveWidgetSettings}
              disabled={saving}
              className="py-2.5 px-5 rounded-[12px] bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 shadow-sm"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Widget Settings
            </button>
          </div>
        )}

        {/* ── Tab 3: Embed Code ───────────────────────────────── */}
        {activeTab === 'embed' && (
          <div className="rounded-[18px] bg-[#131318] border border-[#27272A] p-6 space-y-4">
            {!config?.embed_token ? (
              <div className="py-8 px-6 rounded-[14px] bg-[#09090B] border border-[#27272A] text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  {isCrawlCompleted ? <Sparkles className="w-6 h-6 text-[#22C55E]" /> : <Lock className="w-6 h-6 text-amber-400" />}
                </div>
                <div className="space-y-1">
                  <h4 className="font-heading font-bold text-base text-white">
                    {isCrawlCompleted ? 'Chatbot Script Not Generated Yet' : 'Crawl Required Before Script Generation'}
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                    {isCrawlCompleted
                      ? 'Your site content is indexed and ready. Click Generate Chatbot below to build your AI chatbot configuration and create your unique script embed snippet.'
                      : `Current crawl status is "${crawlStatus}". Websites that have not completed crawling cannot generate a chatbot script.`}
                  </p>
                </div>
                {isCrawlCompleted ? (
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="px-6 py-2.5 rounded-[12px] bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-[#22C55E]/20 disabled:opacity-50"
                  >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Generate Chatbot</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-6 py-2.5 rounded-[12px] bg-zinc-800 text-zinc-500 text-xs font-bold transition-all inline-flex items-center gap-2 border border-zinc-700 opacity-60 cursor-not-allowed mx-auto"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Crawl Required</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-sm text-white">
                    Integration Embed Snippet
                  </h3>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#22C55E]/15 text-[#22C55E] hover:bg-[#22C55E]/25 border border-[#22C55E]/30 text-xs font-semibold transition-all cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy Snippet'}
                  </button>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  Add this single tag to your website template immediately before the closing{' '}
                  <code className="bg-[#09090B] px-1.5 py-0.5 rounded text-zinc-300 font-mono text-[11px]">&lt;/body&gt;</code>{' '}
                  or inside the{' '}
                  <code className="bg-[#09090B] px-1.5 py-0.5 rounded text-zinc-300 font-mono text-[11px]">&lt;head&gt;</code>{' '}
                  tag. The script autonomously attaches a Shadow DOM root that will not conflict with your CSS styles.
                </p>

                <div className="p-4 rounded-[14px] bg-[#09090B] border border-[#27272A] overflow-x-auto select-all">
                  <code className="text-[#22C55E] font-mono text-xs break-all">
                    {embedScriptTag}
                  </code>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Tab 4: Manual Knowledge ─────────────────────────── */}
        {activeTab === 'knowledge' && (
          <div className="rounded-[18px] bg-[#131318] border border-[#27272A] p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-heading font-bold text-sm text-white">
                  Manual Knowledge Base Entries
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Inject explicit facts, Q&amp;A, and policies that take precedence during answer generation.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingKnowledge(null);
                  setKnowledgeForm({ title: '', content: '' });
                  setShowKnowledgeModal(true);
                }}
                className="px-3.5 py-2 rounded-[10px] bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Knowledge
              </button>
            </div>

            {/* Search filter for knowledge */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={knowledgeSearch}
                onChange={(e) => setKnowledgeSearch(e.target.value)}
                placeholder="Search manual knowledge entries..."
                className="w-full h-9 pl-8 pr-4 rounded-[10px] bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#22C55E] transition-colors"
              />
            </div>

            {/* Knowledge Table / List */}
            {filteredKnowledge.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs rounded-[14px] bg-[#09090B] border border-[#27272A] p-6 space-y-2">
                <p>No manual knowledge entries found.</p>
                <button
                  onClick={() => {
                    setEditingKnowledge(null);
                    setKnowledgeForm({ title: '', content: '' });
                    setShowKnowledgeModal(true);
                  }}
                  className="text-xs font-semibold text-[#22C55E] hover:underline"
                >
                  Add your first custom fact
                </button>
              </div>
            ) : (
              <div className="rounded-[14px] bg-[#09090B] border border-[#27272A] divide-y divide-[#27272A] overflow-hidden">
                {filteredKnowledge.map((item) => (
                  <div key={item.id} className="p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {item.content}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono pt-1">
                        Updated {new Date(item.updatedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setEditingKnowledge(item);
                          setKnowledgeForm({ title: item.title, content: item.content });
                          setShowKnowledgeModal(true);
                        }}
                        className="p-1.5 rounded-[8px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Edit entry"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteKnowledgeId(item.id)}
                        className="p-1.5 rounded-[8px] text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 5: Sync ─────────────────────────────────────── */}
        {activeTab === 'sync' && (
          <div className="rounded-[18px] bg-[#131318] border border-[#27272A] p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-heading font-bold text-sm text-white">
                  Knowledge Sync &amp; Re-Indexing
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Last synced:{' '}
                  <span className="font-mono text-zinc-200">
                    {activeWebsite?.site?.last_crawled_at
                      ? new Date(activeWebsite.site.last_crawled_at).toLocaleString()
                      : 'Never'}
                  </span>
                </p>
              </div>

              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="px-4 py-2 rounded-[10px] bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50 self-start sm:self-auto"
              >
                {isSyncing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>Sync Now</span>
              </button>
            </div>

            {/* Search Filter for Sync Log */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold text-zinc-300">
                  Recent Sync Events
                </span>
                <div className="relative w-48">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={syncSearch}
                    onChange={(e) => setSyncSearch(e.target.value)}
                    placeholder="Filter events..."
                    className="w-full h-8 pl-8 pr-3 rounded-[8px] bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#22C55E] transition-colors"
                  />
                </div>
              </div>

              {loadingSync ? (
                <div className="space-y-2 py-4">
                  <SkeletonBlock className="h-10 rounded-[10px]" />
                  <SkeletonBlock className="h-10 rounded-[10px]" />
                </div>
              ) : filteredSyncJobs.length === 0 ? (
                <div className="py-10 text-center text-zinc-500 text-xs rounded-[14px] bg-[#09090B] border border-[#27272A] p-4">
                  No sync events logged yet. Click <strong>Sync Now</strong> to trigger an update.
                </div>
              ) : (
                <div className="rounded-[14px] bg-[#09090B] border border-[#27272A] divide-y divide-[#27272A] overflow-hidden">
                  {filteredSyncJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-3.5 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              job.status === 'completed'
                                ? 'bg-[#22C55E]'
                                : job.status === 'running'
                                ? 'bg-blue-400 animate-pulse'
                                : 'bg-amber-400'
                            }`}
                          />
                          <span className="font-semibold text-white uppercase text-[10px] tracking-wider">
                            {job.status}
                          </span>
                          <span className="text-zinc-500 font-mono text-[10px]">
                            job_{job.id}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 font-mono">
                          {job.started_at ? new Date(job.started_at).toLocaleString() : '-'}
                        </p>
                      </div>

                      <div className="text-right text-[11px] font-mono text-zinc-400">
                        {job.pages_crawled !== null ? `${job.pages_crawled} pages indexed` : 'Sync trigger'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab 6: Live Preview in Center Panel (< 1024px screen) ── */}
        {activeTab === 'preview' && (
          <div className="rounded-[18px] bg-[#131318] border border-[#27272A] p-4 space-y-4 lg:hidden">
            <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#22C55E]" /> Live Interactive Preview
              </span>
              <span className="text-[10px] font-semibold text-[#22C55E] bg-[#22C55E]/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" /> Real-time
              </span>
            </div>

            <WidgetLivePreview
              themeColor={themeColor}
              backgroundColor={backgroundColor}
              textColor={textColor}
              logoUrl={config?.logo_url}
              websiteName={chatbotName || activeWebsite.domain}
              domain={activeWebsite.domain}
              tenantId={activeWebsite.site_id || activeWebsite.id}
              chatbotName={chatbotName}
              welcomeMessage={welcomeMessage}
              placeholderText={placeholderText}
              widgetPosition={widgetPosition}
              deviceMode={deviceMode}
              onDeviceModeChange={setDeviceMode}
            />
          </div>
        )}
      </div>

      {/* ── PANEL 3: Right Fixed Panel (380px - 410px) ─────────── */}
      {/* Live Preview Panel (Always visible on desktop and at 110% / 125% zoom) */}
      <aside className="hidden lg:flex w-[380px] xl:w-[410px] shrink-0 border-l border-[#27272A] bg-[#131318] flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="p-3.5 border-b border-[#27272A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#22C55E]" />
            <h3 className="font-heading font-bold text-xs text-white uppercase tracking-wider">
              Live Preview
            </h3>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/25 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            Real-time
          </span>
        </div>

        {/* Live Widget in Device Frame */}
        <div className="p-3.5 flex-1 flex flex-col items-center">
          <WidgetLivePreview
            themeColor={themeColor}
            backgroundColor={backgroundColor}
            textColor={textColor}
            logoUrl={config?.logo_url}
            websiteName={chatbotName || activeWebsite.domain}
            domain={activeWebsite.domain}
            tenantId={activeWebsite.site_id || activeWebsite.id}
            chatbotName={chatbotName}
            welcomeMessage={welcomeMessage}
            placeholderText={placeholderText}
            widgetPosition={widgetPosition}
            deviceMode={deviceMode}
            onDeviceModeChange={setDeviceMode}
          />
        </div>
      </aside>

      {/* ── Regenerate Confirmation Modal ─────────────────────── */}
      <ConfirmModal
        isOpen={showRegenModal}
        onClose={() => setShowRegenModal(false)}
        onConfirm={handleGenerate}
        loading={generating}
        title="Reset Custom Branding?"
        description="You currently have manual color overrides locked. Regenerating will re-extract site colors from the target domain and discard your custom branding overrides."
        confirmText="Reset & Regenerate"
        cancelText="Cancel"
        danger={false}
        icon={ShieldAlert}
      />

      {/* ── Add/Edit Knowledge Modal ──────────────────────────── */}
      {showKnowledgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowKnowledgeModal(false)}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md bg-[#131318] border border-[#27272A] rounded-[18px] p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-base text-white">
                {editingKnowledge ? 'Edit Knowledge Entry' : 'New Knowledge Entry'}
              </h3>
              <button
                onClick={() => setShowKnowledgeModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveKnowledge} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">
                  Topic / Question Title
                </label>
                <input
                  type="text"
                  value={knowledgeForm.title}
                  onChange={(e) =>
                    setKnowledgeForm({ ...knowledgeForm, title: e.target.value })
                  }
                  placeholder="e.g. Return Policy"
                  className="w-full h-10 px-3 rounded-[10px] bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-[#22C55E]"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">
                  Detailed Answer / Knowledge Fact
                </label>
                <textarea
                  rows={4}
                  value={knowledgeForm.content}
                  onChange={(e) =>
                    setKnowledgeForm({ ...knowledgeForm, content: e.target.value })
                  }
                  placeholder="e.g. Returns accepted within 30 days of receipt..."
                  className="w-full p-3 rounded-[10px] bg-[#09090B] border border-[#27272A] text-xs text-white focus:outline-none focus:border-[#22C55E] resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setShowKnowledgeModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-[10px] bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!knowledgeForm.title.trim() || !knowledgeForm.content.trim()}
                  className="px-4 py-2 text-xs font-bold rounded-[10px] bg-[#22C55E] hover:bg-[#16A34A] text-white disabled:opacity-50"
                >
                  Save Knowledge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Knowledge Confirmation Modal ───────────────── */}
      <ConfirmModal
        isOpen={Boolean(deleteKnowledgeId)}
        onClose={() => setDeleteKnowledgeId(null)}
        onConfirm={handleDeleteKnowledge}
        title="Delete Knowledge Entry?"
        description="Are you sure you want to delete this custom knowledge entry? It will no longer be provided to the RAG context."
        confirmText="Delete Entry"
        cancelText="Cancel"
        danger={true}
      />
    </div>
  );
};

export default ChatbotStudio;
