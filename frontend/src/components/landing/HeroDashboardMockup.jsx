import React from 'react';
import { motion } from 'framer-motion';
import {
  Globe, CheckCircle2, MessageSquare,
  AlertCircle, ExternalLink, RefreshCw
} from 'lucide-react';
import Badge from '../ui/Badge';

/**
 * HeroDashboardMockup — compact hero preview card.
 * Sub-cards have breathing room between them; internals are tight but readable.
 */
const HeroDashboardMockup = () => (
  <motion.div
    initial={{ opacity: 0, x: 32, y: 8 }}
    animate={{ opacity: 1, x: 0, y: 0 }}
    transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    className="relative w-full max-w-[400px] select-none"
    aria-hidden="true"
  >
    {/* Ambient glow */}
    <div
      className="absolute -inset-8 rounded-3xl opacity-20 pointer-events-none"
      style={{ background: 'radial-gradient(ellipse at 60% 40%, #22C55E 0%, transparent 65%)' }}
    />

    {/* Outer container */}
    <div className="relative rounded-2xl bg-white dark:bg-[#0E0E12] border border-zinc-200 dark:border-[#27272A] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)] overflow-hidden">

      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-100 dark:border-[#27272A] bg-zinc-50 dark:bg-[#131318]">
        <div className="w-2 h-2 rounded-full bg-[#3F3F46]" />
        <div className="w-2 h-2 rounded-full bg-[#3F3F46]" />
        <div className="w-2 h-2 rounded-full bg-[#3F3F46]" />
        <div className="flex-1 mx-3">
          <div className="mx-auto w-40 h-4 rounded bg-[#1C1C22] flex items-center justify-center gap-1.5">
            <Globe className="w-2 h-2 text-zinc-500" />
            <span className="text-[8px] text-zinc-500 font-mono">app.sitemind.ai</span>
          </div>
        </div>
      </div>

      {/* Card body — space-y-3 gives breathing room between sub-cards */}
      <div className="p-3 space-y-3">

        {/* ── Row 1: Site header ── */}
        <div className="flex items-center justify-between bg-[#131318] rounded-xl border border-[#27272A] px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Globe className="w-3 h-3 text-accent" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-white font-mono">docs.acme.com</div>
              <div className="text-[8px] text-zinc-500">Tenant ID: website_0042</div>
            </div>
          </div>
          <Badge variant="verified" />
        </div>

        {/* ── Row 2: Two stat cards ── */}
        <div className="grid grid-cols-2 gap-2">
          {/* Crawl Status */}
          <div className="bg-[#131318] rounded-xl border border-[#27272A] p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] text-zinc-500 uppercase tracking-wider">Crawl Status</span>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw className="w-2 h-2 text-accent" />
              </motion.div>
            </div>
            <div className="text-[13px] font-bold text-white font-mono leading-none">847</div>
            <div className="text-[8px] text-zinc-500 mt-0.5">pages indexed</div>
            <div className="mt-1.5 h-0.5 rounded-full bg-[#27272A]">
              <motion.div
                className="h-full rounded-full bg-accent"
                initial={{ width: '0%' }}
                animate={{ width: '73%' }}
                transition={{ duration: 1.5, delay: 0.8, ease: 'easeOut' }}
              />
            </div>
            <div className="text-[8px] text-zinc-500 mt-0.5">73% complete</div>
          </div>

          {/* Verified */}
          <div className="bg-[#131318] rounded-xl border border-[#27272A] p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] text-zinc-500 uppercase tracking-wider">Verified</span>
              <CheckCircle2 className="w-2 h-2 text-accent" />
            </div>
            <div className="text-[13px] font-bold text-white font-mono leading-none">12,483</div>
            <div className="text-[8px] text-zinc-500 mt-0.5">chunks stored</div>
            <div className="mt-1.5 flex gap-0.5 items-end h-[14px]">
              {[40, 65, 52, 80, 60, 90, 75].map((h, i) => (
                <motion.div
                  key={i}
                  className="flex-1 rounded-sm bg-accent/60"
                  initial={{ height: '1px' }}
                  animate={{ height: `${h * 0.14}px` }}
                  transition={{ duration: 0.6, delay: i * 0.05 + 0.5 }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 3: Chatbot conversation panel ── */}
        <div className="bg-[#131318] rounded-xl border border-[#27272A] p-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <MessageSquare className="w-2.5 h-2.5 text-accent" />
              <span className="text-[9px] font-semibold text-zinc-300">Chatbot Preview</span>
            </div>
            <Badge variant="active" label="Live" />
          </div>

          <div className="space-y-1.5">
            {/* User message */}
            <div className="flex justify-end">
              <div className="max-w-[75%] bg-accent/15 border border-accent/20 rounded-xl rounded-tr-sm px-2 py-1">
                <p className="text-[10px] text-white leading-snug">What's the rate limit for the API?</p>
              </div>
            </div>

            {/* Bot answer */}
            <div className="flex justify-start">
              <div className="max-w-[90%] space-y-1">
                <div className="bg-[#0E0E12] border border-[#27272A] rounded-xl rounded-tl-sm px-2 py-1.5">
                  <p className="text-[10px] text-zinc-200 leading-snug">
                    The API enforces{' '}
                    <span className="bg-accent/20 text-accent px-0.5 rounded font-medium">
                      1,000 req / min
                    </span>{' '}
                    per tenant — returns HTTP 429 with Retry-After.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-0.5">
                  <div className="flex items-center gap-1 text-[8px] text-accent">
                    <CheckCircle2 className="w-2 h-2" />
                    <span>Entailment verified</span>
                  </div>
                  <span className="text-zinc-600 text-[8px]">·</span>
                  <div className="flex items-center gap-0.5 text-[8px] text-zinc-500">
                    <ExternalLink className="w-2 h-2" />
                    <span className="font-mono">/docs/api-limits</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fallback example */}
            <div className="flex justify-start">
              <div className="max-w-[90%]">
                <div className="bg-[#0E0E12] border border-amber-500/20 rounded-xl rounded-tl-sm px-2 py-1.5">
                  <div className="flex items-center gap-1 mb-0.5">
                    <AlertCircle className="w-2 h-2 text-amber-400" />
                    <span className="text-[8px] text-amber-400 font-medium">Low confidence — fallback</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-snug">
                    I couldn't find a verified answer. Check the pricing page or contact support.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </motion.div>
);

export default HeroDashboardMockup;
