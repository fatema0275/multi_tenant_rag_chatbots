import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  X,
  Send,
  Globe,
  Monitor,
  Smartphone,
  Wifi,
  Battery,
  Lock,
} from 'lucide-react';

const WidgetLivePreview = ({
  themeColor = '#22C55E',
  backgroundColor = '#ffffff',
  textColor = '#111111',
  logoUrl = null,
  websiteName = 'SiteMind AI',
  domain = 'example.com',
  tenantId = null,
  chatbotName = '',
  welcomeMessage = '',
  placeholderText = 'Type a message…',
  widgetPosition = 'bottom-right',
  deviceMode = 'desktop',
  onDeviceModeChange,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [internalMode, setInternalMode] = useState('desktop');
  const activeMode = onDeviceModeChange ? deviceMode : internalMode;
  const setMode = onDeviceModeChange || setInternalMode;

  const displayName = chatbotName || websiteName || 'SiteMind AI';
  const initialGreeting =
    welcomeMessage || `Hello! Welcome to ${displayName}. How can I assist you today?`;

  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: initialGreeting },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesContainerRef = useRef(null);

  // Reset conversation when site or greeting changes
  useEffect(() => {
    setMessages([
      {
        id: Date.now(),
        sender: 'bot',
        text: initialGreeting,
      },
    ]);
    setInput('');
    setIsTyping(false);
  }, [tenantId, initialGreeting]);

  // Contained auto-scroll: strictly within the message container, NEVER scrolling the outer page
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    const userText = input.trim();
    const currentTenantId = tenantId;
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text: userText }]);
    setInput('');
    setIsTyping(true);

    try {
      const targetTenantId = currentTenantId || 'a1111111-1111-1111-1111-111111111111';

      let response = await fetch(`http://localhost:5000/api/chat/${targetTenantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userText }),
      });

      if (response.status === 401) {
        response = await fetch(`http://localhost:5000/api/chat/${targetTenantId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: userText }),
        });
      }

      const data = await response.json();
      setIsTyping(false);

      if (response.ok && data && data.answer) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, sender: 'bot', text: data.answer },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            text:
              data?.error ||
              data?.answer ||
              "I'm here to answer any questions about our website content.",
          },
        ]);
      }
    } catch (err) {
      console.error('[LivePreview] Error calling chat API:', err);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: 'I can answer questions based on your indexed website content!',
        },
      ]);
    }
  };

  const initial = (displayName || 'A')[0].toUpperCase();
  const bgIsDark = (() => {
    const hex = (backgroundColor || '#ffffff').replace('#', '');
    const r = parseInt(hex.substr(0, 2) || 'ff', 16);
    const g = parseInt(hex.substr(2, 2) || 'ff', 16);
    const b = parseInt(hex.substr(4, 2) || 'ff', 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  })();

  const botBubbleBg = bgIsDark ? 'rgba(255,255,255,0.14)' : '#f1f5f9';
  const inputBg = bgIsDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9';
  const inputBorder = bgIsDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0';

  const isLeft = widgetPosition === 'bottom-left';

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* ── MODE 1: DESKTOP PREVIEW FRAME ─────────────────────── */}
      {activeMode === 'desktop' && (
        <div className="w-full h-[460px] rounded-[18px] overflow-hidden border border-[#27272A] bg-[#09090B] shadow-2xl flex flex-col transition-all duration-200">
          {/* Desktop Browser Chrome */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#131318] border-b border-[#27272A] shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]/80" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#09090B] border border-[#27272A] text-[10.5px] font-mono text-zinc-400 max-w-[200px] truncate">
                <Lock className="w-2.5 h-2.5 text-[#22C55E] shrink-0" />
                <span className="truncate">{domain || 'preview.site.com'}</span>
              </div>
            </div>
            <div className="w-8" />
          </div>

          {/* Desktop Viewport Simulation */}
          <div
            className="relative flex-1 bg-[#131318]/60 overflow-hidden"
            style={{
              backgroundImage:
                'radial-gradient(circle at 15% 15%, rgba(34,197,94,0.04) 0%, transparent 50%), radial-gradient(circle at 85% 85%, rgba(99,102,241,0.04) 0%, transparent 50%)',
            }}
          >
            {/* Simulated website background content */}
            <div className="p-4 space-y-2.5 opacity-25 pointer-events-none">
              <div className="h-3 bg-zinc-600 rounded w-1/2" />
              <div className="h-2 bg-zinc-700 rounded w-full" />
              <div className="h-2 bg-zinc-700 rounded w-5/6" />
              <div className="h-2 bg-zinc-700 rounded w-4/6" />
              <div className="h-2 bg-zinc-700 rounded w-3/4" />
            </div>

            {/* Desktop Floating Launcher FAB */}
            <motion.button
              onClick={() => setIsOpen((o) => !o)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              style={{ backgroundColor: themeColor }}
              className={`absolute bottom-3.5 ${
                isLeft ? 'left-3.5' : 'right-3.5'
              } w-12 h-12 rounded-full shadow-2xl flex items-center justify-center text-white cursor-pointer z-30 border-2 border-white/25`}
              title="Click to toggle widget preview"
            >
              <AnimatePresence mode="wait">
                {isOpen ? (
                  <motion.div
                    key="x"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.12 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="chat"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.12 }}
                  >
                    <MessageSquare className="w-5 h-5 fill-current" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Desktop Open Chat Panel */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  style={{ backgroundColor }}
                  className={`absolute bottom-[66px] ${
                    isLeft ? 'left-3.5' : 'right-3.5'
                  } w-[285px] rounded-[18px] shadow-2xl flex flex-col overflow-hidden z-20 border border-black/15`}
                >
                  {/* Panel Header */}
                  <div
                    style={{ backgroundColor: themeColor }}
                    className="px-3.5 py-3 flex items-center gap-2.5 shadow-sm"
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                        className="w-7 h-7 rounded-full object-cover bg-white/20 shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs text-white shrink-0">
                        {initial}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white leading-tight truncate">
                        {displayName}
                      </p>
                      <p className="text-[10px] text-white/80 flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Online
                      </p>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Messages list with contained internal scroll */}
                  <div
                    ref={messagesContainerRef}
                    className="p-3 overflow-y-auto space-y-2 max-h-[190px] min-h-[130px]"
                  >
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        style={
                          m.sender === 'user'
                            ? { backgroundColor: themeColor, color: '#fff' }
                            : { backgroundColor: botBubbleBg, color: textColor }
                        }
                        className={`max-w-[85%] px-3 py-2 rounded-[14px] text-[11px] leading-relaxed whitespace-pre-wrap shadow-sm ${
                          m.sender === 'user'
                            ? 'ml-auto rounded-br-none'
                            : 'mr-auto rounded-bl-none'
                        }`}
                      >
                        {m.text}
                      </div>
                    ))}
                    {isTyping && (
                      <div
                        style={{ backgroundColor: botBubbleBg }}
                        className="mr-auto px-2.5 py-1.5 rounded-[12px] rounded-bl-none flex items-center gap-1"
                      >
                        <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce" />
                        <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.15s]" />
                        <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.3s]" />
                      </div>
                    )}
                  </div>

                  {/* Chat Input form */}
                  <form
                    onSubmit={handleSend}
                    className="flex items-center gap-1.5 px-3 py-2.5 border-t"
                    style={{ borderColor: inputBorder }}
                  >
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={placeholderText || 'Type a message…'}
                      style={{ color: textColor, backgroundColor: inputBg }}
                      className="flex-1 px-3 py-1.5 rounded-full text-[11px] outline-none border border-transparent focus:border-zinc-400 transition-colors placeholder:text-zinc-400"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isTyping}
                      style={{ backgroundColor: themeColor }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 cursor-pointer disabled:opacity-40 transition-transform active:scale-90"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── MODE 2: MOBILE PREVIEW FRAME ───────────────────────── */}
      {activeMode === 'mobile' && (
        <div className="w-[300px] h-[460px] rounded-[38px] border-[8px] border-zinc-800 bg-[#09090B] shadow-2xl p-1 relative flex flex-col overflow-hidden transition-all duration-200">
          {/* Mobile Top Status Bar & Dynamic Island */}
          <div className="h-6 px-4 flex items-center justify-between text-[10px] text-zinc-400 font-mono shrink-0 select-none z-30">
            <span>9:41</span>
            <div className="w-16 h-3.5 bg-black rounded-full border border-zinc-800 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
            </div>
            <div className="flex items-center gap-1">
              <Wifi className="w-2.5 h-2.5" />
              <Battery className="w-3 h-3" />
            </div>
          </div>

          {/* Simulated Mobile Browser Address Bar */}
          <div className="px-3 py-1 bg-[#131318] border-b border-[#27272A] shrink-0 flex items-center justify-center">
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#09090B] text-[9.5px] font-mono text-zinc-400 truncate max-w-[200px]">
              <Lock className="w-2 h-2 text-[#22C55E]" />
              <span className="truncate">{domain || 'mobile.site.com'}</span>
            </div>
          </div>

          {/* Mobile Screen Area */}
          <div
            className="relative flex-1 bg-[#131318]/60 overflow-hidden flex flex-col"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 20%, rgba(34,197,94,0.05) 0%, transparent 60%)',
            }}
          >
            {/* Background Content Skeleton */}
            <div className="p-3 space-y-2 opacity-25 pointer-events-none">
              <div className="h-3 bg-zinc-600 rounded w-2/3" />
              <div className="h-2 bg-zinc-700 rounded w-full" />
              <div className="h-2 bg-zinc-700 rounded w-4/5" />
            </div>

            {/* Mobile Open Chat Panel: Fits the mobile screen nicely */}
            <AnimatePresence>
              {isOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: 0.16 }}
                  style={{ backgroundColor }}
                  className="absolute inset-x-2 bottom-3 top-2 rounded-[18px] shadow-2xl flex flex-col overflow-hidden z-20 border border-black/15"
                >
                  {/* Mobile Header */}
                  <div
                    style={{ backgroundColor: themeColor }}
                    className="px-3 py-2 flex items-center gap-2"
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                        className="w-6 h-6 rounded-full object-cover bg-white/20 shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                        {initial}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-white leading-tight truncate">
                        {displayName}
                      </p>
                      <p className="text-[9px] text-white/80 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Online
                      </p>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Messages list with contained scroll */}
                  <div
                    ref={messagesContainerRef}
                    className="p-2.5 overflow-y-auto space-y-1.5 flex-1"
                  >
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        style={
                          m.sender === 'user'
                            ? { backgroundColor: themeColor, color: '#fff' }
                            : { backgroundColor: botBubbleBg, color: textColor }
                        }
                        className={`max-w-[85%] px-2.5 py-1.5 rounded-[12px] text-[10.5px] leading-relaxed whitespace-pre-wrap ${
                          m.sender === 'user'
                            ? 'ml-auto rounded-br-none'
                            : 'mr-auto rounded-bl-none'
                        }`}
                      >
                        {m.text}
                      </div>
                    ))}
                    {isTyping && (
                      <div
                        style={{ backgroundColor: botBubbleBg }}
                        className="mr-auto px-2 py-1 rounded-[10px] rounded-bl-none flex items-center gap-1"
                      >
                        <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce" />
                        <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.15s]" />
                        <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.3s]" />
                      </div>
                    )}
                  </div>

                  {/* Input form */}
                  <form
                    onSubmit={handleSend}
                    className="flex items-center gap-1.5 px-2.5 py-2 border-t"
                    style={{ borderColor: inputBorder }}
                  >
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={placeholderText || 'Type a message…'}
                      style={{ color: textColor, backgroundColor: inputBg }}
                      className="flex-1 px-2.5 py-1.5 rounded-full text-[10px] outline-none border border-transparent focus:border-zinc-400 transition-colors placeholder:text-zinc-400"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isTyping}
                      style={{ backgroundColor: themeColor }}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 cursor-pointer disabled:opacity-40 transition-transform active:scale-90"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </form>
                </motion.div>
              ) : (
                /* Closed state: Floating button at bottom of mobile screen */
                <motion.button
                  onClick={() => setIsOpen(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.94 }}
                  style={{ backgroundColor: themeColor }}
                  className={`absolute bottom-3 ${
                    isLeft ? 'left-3' : 'right-3'
                  } w-11 h-11 rounded-full shadow-2xl flex items-center justify-center text-white cursor-pointer z-30 border-2 border-white/25`}
                >
                  <MessageSquare className="w-4 h-4 fill-current" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Home Bar */}
          <div className="py-1 bg-black shrink-0 flex justify-center">
            <div className="w-24 h-1 bg-zinc-600 rounded-full" />
          </div>
        </div>
      )}

      {/* ── Below Device Frame: Toggle Buttons ───────────────── */}
      <div className="flex items-center justify-center gap-2 w-full max-w-[280px] pt-1">
        <button
          onClick={() => setMode('desktop')}
          id="preview-desktop-btn"
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
            activeMode === 'desktop'
              ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
              : 'bg-[#131318] text-zinc-400 hover:text-zinc-200 border border-[#27272A]'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Desktop</span>
        </button>
        <button
          onClick={() => setMode('mobile')}
          id="preview-mobile-btn"
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
            activeMode === 'mobile'
              ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
              : 'bg-[#131318] text-zinc-400 hover:text-zinc-200 border border-[#27272A]'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Mobile</span>
        </button>
      </div>
    </div>
  );
};

export default WidgetLivePreview;
