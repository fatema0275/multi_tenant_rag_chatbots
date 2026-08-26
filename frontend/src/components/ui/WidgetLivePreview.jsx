import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Globe } from 'lucide-react';

const WidgetLivePreview = ({
  themeColor = '#22C55E',
  backgroundColor = '#ffffff',
  textColor = '#111111',
  logoUrl = null,
  websiteName = 'SiteMind AI',
  domain = 'example.com',
  tenantId = null,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: `Hello! Welcome to ${websiteName}. How can I assist you today?` },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    const userText = input.trim();
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text: userText }]);
    setInput('');
    setIsTyping(true);

    try {
      const token = localStorage.getItem('token') || '';
      const targetTenantId = tenantId || 'a1111111-1111-1111-1111-111111111111';
      const response = await fetch(`http://localhost:5000/api/chat/${targetTenantId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: userText })
      });

      const data = await response.json();
      setIsTyping(false);

      if (data && data.answer) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, sender: 'bot', text: data.answer },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, sender: 'bot', text: "I can only answer based on verified information from this site's content." },
        ]);
      }
    } catch (err) {
      console.error('[LivePreview] Error calling chat API:', err);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'bot', text: 'Error connecting to RAG backend service. Please check your backend connection.' },
      ]);
    }
  };

  const initial = (websiteName || 'A')[0].toUpperCase();
  const bgIsDark = (() => {
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  })();

  const botBubbleBg = bgIsDark ? 'rgba(255,255,255,0.12)' : '#f1f5f9';
  const inputBg = bgIsDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9';
  const inputBorder = bgIsDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0';

  return (
    <div className="w-full flex flex-col gap-4">
      {/* ── Mock browser frame ── */}
      <div className="w-full rounded-2xl overflow-hidden border border-zinc-700 shadow-2xl">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800">
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-amber-400/80" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-800 text-xs font-mono text-zinc-400 max-w-xs truncate">
              <Globe className="w-3 h-3 text-zinc-500 shrink-0" />
              <span className="truncate">{domain || 'preview.site.com'}</span>
            </div>
          </div>
          <div className="w-14" />
        </div>

        {/* Simulated page viewport */}
        <div
          className="relative h-[460px] bg-zinc-800 overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(34,197,94,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(99,102,241,0.05) 0%, transparent 50%)',
          }}
        >
          {/* Page placeholder content */}
          <div className="p-6 space-y-3">
            <div className="h-3 bg-zinc-700/60 rounded w-2/3" />
            <div className="h-2.5 bg-zinc-700/40 rounded w-full" />
            <div className="h-2.5 bg-zinc-700/40 rounded w-5/6" />
            <div className="h-2.5 bg-zinc-700/40 rounded w-4/6" />
            <div className="h-2.5 bg-zinc-700/40 rounded w-full" />
            <div className="h-2.5 bg-zinc-700/40 rounded w-3/4" />
          </div>

          {/* ── Launcher FAB ── */}
          <motion.button
            onClick={() => setIsOpen((o) => !o)}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.93 }}
            style={{ backgroundColor: themeColor }}
            className="absolute bottom-5 right-5 w-12 h-12 rounded-full shadow-2xl flex items-center justify-center text-white cursor-pointer z-30 border-2 border-white/20"
          >
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <X className="w-5 h-5" />
                </motion.div>
              ) : (
                <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <MessageSquare className="w-5 h-5 fill-current" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* ── Chat Panel ── */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.95 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={{ backgroundColor }}
                className="absolute bottom-[72px] right-5 left-5 sm:left-auto sm:w-[300px] rounded-2xl shadow-2xl flex flex-col overflow-hidden z-20 border border-black/10"
              >
                {/* Header */}
                <div
                  style={{ backgroundColor: themeColor }}
                  className="px-4 py-3 flex items-center gap-3"
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      onError={(e) => { e.target.style.display = 'none'; }}
                      className="w-7 h-7 rounded-full object-cover bg-white/20 shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs text-white shrink-0">
                      {initial}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white leading-tight truncate">{websiteName}</p>
                    <p className="text-[10px] text-white/70 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse inline-block" />
                      Online · Ask us anything
                    </p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2 max-h-[180px]">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      style={
                        m.sender === 'user'
                          ? { backgroundColor: themeColor, color: '#fff' }
                          : { backgroundColor: botBubbleBg, color: textColor }
                      }
                      className={`max-w-[85%] px-3 py-2 rounded-2xl text-[11px] leading-snug ${
                        m.sender === 'user' ? 'ml-auto rounded-br-none' : 'mr-auto rounded-bl-none'
                      }`}
                    >
                      {m.text}
                    </div>
                  ))}
                  {isTyping && (
                    <div
                      style={{ backgroundColor: botBubbleBg }}
                      className="mr-auto px-3 py-2 rounded-2xl rounded-bl-none flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.3s]" />
                    </div>
                  )}
                </div>

                {/* Input */}
                <form
                  onSubmit={handleSend}
                  className="flex items-center gap-2 px-3 py-2.5 border-t"
                  style={{ borderColor: inputBorder }}
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message…"
                    style={{ color: textColor, backgroundColor: inputBg }}
                    className="flex-1 px-3 py-2 rounded-full text-[11px] outline-none border border-transparent focus:border-zinc-300 transition-colors placeholder:text-zinc-400"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    style={{ backgroundColor: themeColor }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 cursor-pointer disabled:opacity-40 transition-transform active:scale-90"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Label underneath ── */}
      <p className="text-[11px] text-zinc-500 text-center">
        Click the <strong className="text-zinc-300">chat bubble</strong> to toggle open/closed
      </p>
    </div>
  );
};

export default WidgetLivePreview;
