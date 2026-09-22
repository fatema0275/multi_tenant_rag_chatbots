import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Sparkles, Bot, Copy, Check, Lock, RefreshCw,
  Palette, Code, AlertTriangle, Loader2, ShieldAlert,
} from 'lucide-react';

const ChatbotGeneratorCard = ({ website, onConfigChange }) => {
  const token = useSelector((s) => s.auth.token);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);

  const [themeColor, setThemeColor] = useState('#22C55E');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#111111');

  const crawlStatus = website?.site?.crawl_status || website?.crawl_status || 'pending';
  const isCrawlCompleted = crawlStatus === 'completed' || crawlStatus === 'cancelled' || Boolean(website?.tokens_used);

  useEffect(() => {
    if (!website?.id || !token) return;
    setConfig(null);
    setLoading(true);
    fetch(`/api/chatbot/config/${website.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error && data.exists !== false) {
          setConfig(data);
          setThemeColor(data.theme_color || '#22C55E');
          setBackgroundColor(data.background_color || '#ffffff');
          setTextColor(data.text_color || '#111111');
          if (onConfigChange) onConfigChange(data);
        } else {
          setConfig(null);
          if (onConfigChange) onConfigChange(null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [website?.id, token]);

  const handleGenerate = async () => {
    if (!website?.id || !token || !isCrawlCompleted) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/chatbot/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ website_id: website.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to generate chatbot configuration');
      } else {
        setConfig(data);
        setThemeColor(data.theme_color || '#22C55E');
        setBackgroundColor(data.background_color || '#ffffff');
        setTextColor(data.text_color || '#111111');
        toast.success('Chatbot configuration generated!');
        if (onConfigChange) onConfigChange(data);
      }
    } catch {
      toast.error('Network error. Check backend connection.');
    } finally {
      setGenerating(false);
      setShowRegenModal(false);
    }
  };

  const handleSaveOverrides = async () => {
    if (!website?.id || !token) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/chatbot/config/${website.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ theme_color: themeColor, background_color: backgroundColor, text_color: textColor }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save custom colors');
      } else {
        setConfig(data);
        toast.success('Custom branding saved and locked!');
        if (onConfigChange) onConfigChange(data);
      }
    } catch {
      toast.error('Network error while saving overrides');
    } finally {
      setSaving(false);
    }
  };

  const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : window.location.origin;
  const embedScriptTag = config?.embed_token
    ? `<script src="${baseUrl}/static/widget-v1.js" data-token="${config.embed_token}"></script>`
    : '';

  const handleCopyCode = () => {
    if (!embedScriptTag) return;
    navigator.clipboard.writeText(embedScriptTag);
    setCopied(true);
    toast.success('Embed script copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const websiteLabel = website?.domain
    ? website.domain.split('.')[0].toUpperCase()
    : 'SITE';

  const colorFields = [
    { id: 'theme', label: 'Theme Color', value: themeColor, onChange: setThemeColor },
    { id: 'bg', label: 'Background', value: backgroundColor, onChange: setBackgroundColor },
    { id: 'text', label: 'Text Color', value: textColor, onChange: setTextColor },
  ];

  /* ─────────────────────────────────────────── */
  return (
    <div className="space-y-4">

      {/* ── Section 1: Status + Action ── */}
      <div className="rounded-2xl bg-zinc-800/50 border border-zinc-700/60 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI Chatbot Configuration</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Generate widget, extract branding &amp; get your chatbot code.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="shrink-0">
            {config ? (
              <button
                onClick={() => config.overrides_locked ? setShowRegenModal(true) : handleGenerate()}
                disabled={generating || !isCrawlCompleted}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-700 text-zinc-200 hover:bg-zinc-600 border border-zinc-600 transition-all disabled:opacity-40 cursor-pointer"
              >
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Regenerate
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={generating || !isCrawlCompleted}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-400 transition-all disabled:opacity-40 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate Chatbot
              </button>
            )}
          </div>
        </div>

        {/* Lock badge */}
        {config?.overrides_locked && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-400">
            <Lock className="w-3.5 h-3.5" />
            <span>Manual color overrides active — regenerating will re-extract branding</span>
          </div>
        )}

        {/* Crawl warning */}
        {!isCrawlCompleted && (
          <div className="mt-3 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Scan status is <strong>{crawlStatus}</strong>. Complete the website scan first.</span>
          </div>
        )}
      </div>

      {/* ── Loading state ── */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-xs text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          Loading configuration…
        </div>
      )}

      {/* ── Section 2: Branding (only if config exists) ── */}
      {!loading && config && (
        <>
          {/* Custom Branding & Colors */}
          <div className="rounded-2xl bg-zinc-800/50 border border-zinc-700/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">Branding &amp; Colors</h4>
              </div>
              {config.overrides_locked && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </div>

            {/* Logo row */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-700/50">
              {config.logo_url ? (
                <img
                  src={config.logo_url}
                  alt="Logo"
                  onError={(e) => { e.target.style.display = 'none'; }}
                  className="w-9 h-9 rounded-lg object-cover border border-zinc-700"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm text-white shrink-0"
                  style={{ backgroundColor: themeColor }}
                >
                  {websiteLabel[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white">{website?.domain}</p>
                <p className="text-[11px] text-zinc-500 truncate">
                  {config.logo_url ? config.logo_url : 'No logo extracted — using letter fallback'}
                </p>
              </div>
            </div>

            {/* Color pickers */}
            <div className="space-y-2">
              {colorFields.map((field) => (
                <div key={field.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-700/50">
                  {/* Color swatch (clickable) */}
                  <div
                    className="w-8 h-8 rounded-lg border border-zinc-600 shrink-0 cursor-pointer relative overflow-hidden"
                    style={{ backgroundColor: field.value }}
                    title="Click to pick color"
                  >
                    <input
                      type="color"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </div>
                  {/* Label */}
                  <span className="text-xs text-zinc-300 flex-1">{field.label}</span>
                  {/* Hex input */}
                  <input
                    type="text"
                    value={field.value.toUpperCase()}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="w-22 px-2.5 py-1.5 rounded-lg text-xs font-mono text-center bg-zinc-800 border border-zinc-600 text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
                    style={{ width: '90px' }}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveOverrides}
              disabled={saving}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 shadow-md shadow-emerald-500/20"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              Save &amp; Lock Colors
            </button>
          </div>

          {/* ── Section 3: Your Chatbot Code ── */}
          <div className="rounded-2xl bg-zinc-800/50 border border-zinc-700/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">Your Chatbot Code</h4>
              </div>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500">
              Paste into the <code className="text-zinc-400">&lt;head&gt;</code> or before <code className="text-zinc-400">&lt;/body&gt;</code> of your site:
            </p>
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 overflow-x-auto select-all">
              <code className="text-emerald-400 font-mono text-[11px] break-all">{embedScriptTag}</code>
            </div>
          </div>
        </>
      )}

      {/* ── Empty state ── */}
      {!loading && !config && isCrawlCompleted && (
        <div className="text-center py-12 space-y-3">
          <p className="font-heading font-semibold text-base text-zinc-200">
            No chatbot generated yet.
          </p>
          <p className="text-sm text-zinc-400 max-w-sm mx-auto">
            Extract website branding and create your chatbot widget.
          </p>
          <div className="pt-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-5 py-2.5 rounded-[12px] bg-[#22C55E] hover:bg-[#16A34A] text-white font-semibold text-sm transition-all cursor-pointer shadow-md shadow-[#22C55E]/20 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Generate Chatbot</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Regen Confirm Modal ── */}
      <AnimatePresence>
        {showRegenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700 p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-amber-400">
                <ShieldAlert className="w-5 h-5" />
                <h4 className="font-bold text-base text-white">Reset Branding?</h4>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                You have manual color overrides active. Regenerating will re-extract site colors and <strong className="text-zinc-200">discard your saved colors</strong>.
              </p>
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={() => setShowRegenModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-400 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {generating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Reset &amp; Regenerate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatbotGeneratorCard;
