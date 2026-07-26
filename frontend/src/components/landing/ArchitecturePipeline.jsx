import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

const PIPELINE_NODES = [
  { label: 'Website URL', sub: 'Entry point', accent: false },
  { label: 'Domain Verification', sub: 'DNS TXT / file upload', accent: false },
  { label: 'Sitemap Discovery', sub: 'robots.txt-compliant', accent: false },
  { label: 'Headless Render', sub: 'JS-heavy page support', accent: false },
  { label: 'Content Extraction', sub: 'Strip nav/ads/boilerplate', accent: false },
  { label: 'Hash Deduplication', sub: 'Skip unchanged content', accent: false },
  { label: 'Semantic Chunking', sub: 'Meaningful splits', accent: false },
  { label: 'Embedding Generation', sub: 'Dense vector encoding', accent: false },
  { label: 'pgvector Store', sub: 'RLS-scoped per tenant', accent: true },
  { label: 'Retrieval', sub: 'Top-k similarity search', accent: false },
  { label: 'Generation', sub: 'LLM answer synthesis', accent: false },
  { label: 'Entailment Check', sub: 'Claim-vs-source NLI', accent: true },
];

const OUTPUTS = [
  { label: 'Verified Answer', icon: CheckCircle2, color: 'text-accent border-accent/30 bg-accent/10' },
  { label: 'Fallback Response', icon: AlertCircle, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
];

/**
 * ArchitecturePipeline
 * Horizontal-scrollable engineering pipeline diagram with animated connectors.
 */
const ArchitecturePipeline = () => (
  <div className="relative">
    {/* Scroll container */}
    <div className="overflow-x-auto pb-4 -mx-4 px-4">
      <div className="min-w-[900px]">
        {/* Pipeline row */}
        <div className="flex items-center gap-0">
          {PIPELINE_NODES.map((node, i) => (
            <React.Fragment key={node.label}>
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.35, delay: i * 0.055, ease: 'easeOut' }}
                className={`flex-shrink-0 flex flex-col items-center gap-1.5 rounded-xl border px-3 py-2.5 transition-colors duration-200 min-w-[90px] text-center ${
                  node.accent
                    ? 'bg-accent/10 border-accent/40 hover:border-accent/70'
                    : 'bg-white dark:bg-surface-dark border-zinc-200 dark:border-border-dark hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <div
                  className={`text-[11px] font-semibold leading-tight ${
                    node.accent ? 'text-accent' : 'text-txt-primary-light dark:text-txt-primary-dark'
                  }`}
                >
                  {node.label}
                </div>
                <div className="text-[9px] text-txt-secondary-light dark:text-txt-secondary-dark leading-tight">{node.sub}</div>
              </motion.div>

              {i < PIPELINE_NODES.length - 1 && (
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  whileInView={{ opacity: 1, scaleX: 1 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.3, delay: i * 0.055 + 0.1 }}
                  className="flex-1 flex items-center justify-center"
                  style={{ transformOrigin: 'left' }}
                >
                  <ArrowRight
                    className={`w-4 h-4 flex-shrink-0 ${
                      i === 8 || i === 11 ? 'text-accent' : 'text-zinc-600'
                    }`}
                  />
                </motion.div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Output fork */}
        <div className="mt-4 flex justify-end pr-1">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center mt-1">
              <div className="w-px h-4 bg-accent/40" />
              <div className="w-12 h-px bg-accent/40 relative">
                <div className="absolute right-0 top-0 h-px w-6 bg-accent/40 translate-y-3" />
                <div className="absolute right-0 top-0 h-px w-6 bg-amber-500/40 -translate-y-2" />
              </div>
            </div>
            {OUTPUTS.map(({ label, icon: Icon, color }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.7 + i * 0.1 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-medium ${color}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Output → Embeddable Widget */}
        <div className="mt-3 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.9 }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[12px] font-medium"
          >
            → Embeddable Widget
          </motion.div>
        </div>
      </div>
    </div>

    {/* Scroll hint for narrow screens */}
    <div className="text-[11px] text-txt-secondary-light dark:text-txt-secondary-dark text-center mt-2 md:hidden">
      ← Scroll to see full pipeline →
    </div>
  </div>
);

export default ArchitecturePipeline;
