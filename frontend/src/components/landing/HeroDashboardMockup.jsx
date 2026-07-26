import React from 'react';
import { motion } from 'framer-motion';
import {
  Globe, CheckCircle2, BarChart3, MessageSquare, Zap,
  AlertCircle, ExternalLink, RefreshCw
} from 'lucide-react';
import Badge from '../ui/Badge';

/**
 * HeroDashboardMockup
 * Realistic dashboard UI rendered as React components — shown beside the hero copy.
 * Contains: crawl status card, chatbot preview pane with a conversation that has
 * a source-highlight, and an analytics mini-card.
 */
const HeroDashboardMockup = () => (
  <motion.div
    initial={{ opacity: 0, x: 32, y: 8 }}
    animate={{ opacity: 1, x: 0, y: 0 }}
    transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    className="relative w-full max-w-[520px] select-none"
    aria-hidden="true"
  >
    {/* Ambient glow */}
    <div className="absolute -inset-8 rounded-3xl opacity-20 pointer-events-none"
         style={{ background: 'radial-gradient(ellipse at 60% 40%, #22C55E 0%, transparent 65%)' }} />

    {/* Outer container — simulates a dashboard window */}
    <div className="relative rounded-2xl bg-white dark:bg-[#0E0E12] border border-zinc-200 dark:border-[#27272A] shadow-[0_32px_80px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_32px_80px_-12px_rgba(0,0,0,0.7)] overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-zinc-100 dark:border-[#27272A] bg-zinc-50 dark:bg-[#131318]">
        <div className="w-2.5 h-2.5 rounded-full bg-[#3F3F46]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#3F3F46]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#3F3F46]" />
        <div className="flex-1 mx-4">
          <div className="mx-auto w-48 h-5 rounded-md bg-[#1C1C22] flex items-center justify-center gap-1.5">
            <Globe className="w-2.5 h-2.5 text-zinc-500" />
            <span className="text-[10px] text-zinc-500 font-mono">app.sitemind.ai</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* ── Row 1: Site header + crawl status ── */}
        <div className="flex items-center justify-between bg-[#131318] rounded-xl border border-[#27272A] px-3.5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Globe className="w-4 h-4 text-accent" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white font-mono">docs.acme.com</div>
              <div className="text-[10px] text-zinc-500">Tenant ID: website_0042</div>
            </div>
          </div>
          <Badge variant="verified" />
        </div>

        {/* ── Row 2: Two stat cards ── */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#131318] rounded-xl border border-[#27272A] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Crawl Status</span>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw className="w-3 h-3 text-accent" />
              </motion.div>
            </div>
            <div className="text-[18px] font-bold text-white font-mono">847</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">pages indexed</div>
            <div className="mt-2 h-1 rounded-full bg-[#27272A]">
              <motion.div
                className="h-full rounded-full bg-accent"
                initial={{ width: '0%' }}
                animate={{ width: '73%' }}
                transition={{ duration: 1.5, delay: 0.8, ease: 'easeOut' }}
              />
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">73% complete</div>
          </div>

          <div className="bg-[#131318] rounded-xl border border-[#27272A] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Verified</span>
              <CheckCircle2 className="w-3 h-3 text-accent" />
            </div>
            <div className="text-[18px] font-bold text-white font-mono">12,483</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">chunks stored</div>
            <div className="mt-2 flex gap-0.5">
              {[40, 65, 52, 80, 60, 90, 75].map((h, i) => (
                <motion.div
                  key={i}
                  className="flex-1 rounded-sm bg-accent/60"
                  initial={{ height: '4px' }}
                  animate={{ height: `${h * 0.4}px` }}
                  transition={{ duration: 0.6, delay: i * 0.05 + 0.5 }}
                  style={{ alignSelf: 'flex-end' }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 3: Chatbot conversation panel ── */}
        <div className="bg-[#131318] rounded-xl border border-[#27272A] p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-accent" />
              <span className="text-[11px] font-semibold text-zinc-300">Chatbot Preview</span>
            </div>
            <Badge variant="active" label="Live" />
          </div>

          <div className="space-y-2.5">
            {/* User message */}
            <div className="flex justify-end">
              <div className="max-w-[75%] bg-accent/15 border border-accent/20 rounded-xl rounded-tr-sm px-3 py-2">
                <p className="text-[12px] text-white">
                  What's the rate limit for the API?
                </p>
              </div>
            </div>

            {/* Bot answer with source highlight */}
            <div className="flex justify-start">
              <div className="max-w-[90%] space-y-1.5">
                <div className="bg-[#0E0E12] border border-[#27272A] rounded-xl rounded-tl-sm px-3 py-2">
                  <p className="text-[12px] text-zinc-200 leading-relaxed">
                    The API enforces a limit of{' '}
                    <span className="bg-accent/20 text-accent px-1 rounded font-medium">
                      1,000 requests / minute
                    </span>{' '}
                    per tenant. Exceeding this returns HTTP 429 with a Retry-After header.
                  </p>
                </div>
                {/* Source attribution */}
                <div className="flex items-center gap-1.5 px-1">
                  <div className="flex items-center gap-1 text-[10px] text-accent">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Entailment verified</span>
                  </div>
                  <span className="text-zinc-600 text-[10px]">·</span>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                    <ExternalLink className="w-2.5 h-2.5" />
                    <span className="font-mono">/docs/api-limits#rate-limiting</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Second question */}
            <div className="flex justify-end">
              <div className="max-w-[75%] bg-accent/15 border border-accent/20 rounded-xl rounded-tr-sm px-3 py-2">
                <p className="text-[12px] text-white">
                  Can I increase that limit?
                </p>
              </div>
            </div>

            {/* Fallback example */}
            <div className="flex justify-start">
              <div className="max-w-[90%] space-y-1.5">
                <div className="bg-[#0E0E12] border border-amber-500/20 rounded-xl rounded-tl-sm px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] text-amber-400 font-medium">Low confidence — fallback</span>
                  </div>
                  <p className="text-[12px] text-zinc-400 leading-relaxed">
                    I couldn't find a verified answer in the current documentation. Please check the pricing page or contact support.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 4: Analytics mini card ── */}
        <div className="bg-[#131318] rounded-xl border border-[#27272A] p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-accent" />
              <span className="text-[11px] font-semibold text-zinc-300">7-day Analytics</span>
            </div>
            <span className="text-[10px] text-zinc-500">2,341 queries</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Verified', value: '94.2%', color: 'text-accent' },
              { label: 'Fallback', value: '5.8%', color: 'text-amber-400' },
              { label: 'Avg. Resp', value: '320ms', color: 'text-blue-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <div className={`text-[15px] font-bold font-mono ${color}`}>{value}</div>
                <div className="text-[9px] text-zinc-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

export default HeroDashboardMockup;
