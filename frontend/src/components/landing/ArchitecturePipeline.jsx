import React from 'react';
import { motion } from 'framer-motion';
import {
  Globe, ShieldCheck, FileSearch, Monitor, Scissors, Hash,
  Layers, Cpu, Database, Search, MessageSquare, FlaskConical,
  CheckCircle2, AlertTriangle, Code2, ArrowDown, ArrowRight,
} from 'lucide-react';

// ─── Data ─────────────────────────────────────────────────────────────────────

const INGESTION = [
  { step: 1, icon: Globe,        label: 'Website URL',          sub: 'Entry point'                },
  { step: 2, icon: ShieldCheck,  label: 'Domain Verification',  sub: 'DNS TXT / file upload'      },
  { step: 3, icon: FileSearch,   label: 'Sitemap Discovery',    sub: 'robots.txt-compliant'       },
  { step: 4, icon: Monitor,      label: 'Headless Render',      sub: 'JS-heavy page support'      },
  { step: 5, icon: Scissors,     label: 'Content Extraction',   sub: 'Strip nav / ads / boilerplate' },
  { step: 6, icon: Hash,         label: 'Hash Deduplication',   sub: 'Skip unchanged content'     },
  { step: 7, icon: Layers,       label: 'Semantic Chunking',    sub: 'Meaningful splits'          },
  { step: 8, icon: Cpu,          label: 'Embedding Generation', sub: 'Dense vector encoding'      },
];

const STORAGE = { icon: Database, label: 'pgvector Store', sub: 'RLS-scoped per tenant', accent: true };

const QUERY = [
  { icon: Search,        label: 'Retrieval',        sub: 'Top-k similarity search' },
  { icon: MessageSquare, label: 'Generation',        sub: 'LLM answer synthesis'   },
  { icon: FlaskConical,  label: 'Entailment Check',  sub: 'Claim-vs-source NLI', accent: true },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.35, delay, ease: 'easeOut' },
});

const Connector = ({ vertical = false }) =>
  vertical ? (
    <div className="flex justify-center py-1">
      <ArrowDown className="w-4 h-4 text-zinc-500 dark:text-zinc-600" />
    </div>
  ) : (
    <div className="flex items-center justify-center">
      <ArrowRight className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-600 flex-shrink-0" />
    </div>
  );

const PipeNode = ({ icon: Icon, label, sub, accent = false, step, delay = 0 }) => (
  <motion.div
    {...fade(delay)}
    className={`relative flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-center transition-colors duration-200 ${
      accent
        ? 'bg-accent/10 border-accent/40 hover:border-accent/70'
        : 'bg-zinc-50 dark:bg-[#111115] border-zinc-200 dark:border-border-dark hover:border-zinc-300 dark:hover:border-zinc-600'
    }`}
  >
    {step !== undefined && (
      <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-zinc-800 dark:bg-zinc-700 border border-zinc-600 text-[9px] font-bold text-zinc-300 flex items-center justify-center">
        {step}
      </span>
    )}
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent ? 'bg-accent/20' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
      <Icon className={`w-3.5 h-3.5 ${accent ? 'text-accent' : 'text-txt-secondary-light dark:text-txt-secondary-dark'}`} />
    </div>
    <div className={`text-[11px] font-semibold leading-tight ${accent ? 'text-accent' : 'text-txt-primary-light dark:text-txt-primary-dark'}`}>
      {label}
    </div>
    <div className="text-[9px] text-txt-secondary-light dark:text-txt-secondary-dark leading-tight">{sub}</div>
  </motion.div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const ArchitecturePipeline = () => (
  <div className="space-y-6 text-left">

    {/* ── Phase label ── */}
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-txt-secondary-light dark:text-txt-secondary-dark px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-border-dark">
        Phase 1 — Ingestion
      </span>
      <div className="flex-1 h-px bg-zinc-100 dark:bg-border-dark" />
    </div>

    {/* ── Ingestion grid: 4 columns × 2 rows ── */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-4">
      {INGESTION.map((node, i) => (
        <PipeNode key={node.label} {...node} delay={i * 0.05} />
      ))}
    </div>

    {/* ── Down arrow into storage ── */}
    <Connector vertical />

    {/* ── Storage node (full width, centered) ── */}
    <div className="flex justify-center">
      <motion.div {...fade(0.45)} className="w-full max-w-xs">
        <PipeNode {...STORAGE} />
      </motion.div>
    </div>

    {/* ── Phase label ── */}
    <div className="flex items-center gap-2 pt-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-txt-secondary-light dark:text-txt-secondary-dark px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-border-dark">
        Phase 2 — Query
      </span>
      <div className="flex-1 h-px bg-zinc-100 dark:bg-border-dark" />
    </div>

    {/* ── Query flow: Retrieval → Generation → Entailment Check ── */}
    <div className="flex items-center gap-2">
      {QUERY.map((node, i) => (
        <React.Fragment key={node.label}>
          <div className="flex-1 min-w-0">
            <PipeNode {...node} delay={0.55 + i * 0.07} />
          </div>
          {i < QUERY.length - 1 && <Connector />}
        </React.Fragment>
      ))}
    </div>

    {/* ── Outcome fork ── */}
    <Connector vertical />

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Verified Answer */}
      <motion.div
        {...fade(0.75)}
        className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/8 p-4"
      >
        <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-[12px] font-semibold text-accent">Verified Answer</div>
          <div className="text-[11px] text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
            Claim is supported by source chunks — answer delivered to visitor
          </div>
        </div>
      </motion.div>

      {/* Fallback Response */}
      <motion.div
        {...fade(0.82)}
        className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 p-4"
      >
        <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-[12px] font-semibold text-amber-400">Fallback Response</div>
          <div className="text-[11px] text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
            Claim unsupported — transparent fallback instead of hallucination
          </div>
        </div>
      </motion.div>
    </div>

    {/* ── Embeddable Widget delivery ── */}
    <Connector vertical />

    <motion.div
      {...fade(0.9)}
      className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/8 p-4"
    >
      <Code2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
      <div>
        <div className="text-[12px] font-semibold text-blue-400">Embeddable Widget</div>
        <div className="text-[11px] text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5">
          Branded script tag served to your visitors — scoped entirely to your tenant's knowledge base
        </div>
      </div>
    </motion.div>

  </div>
);

export default ArchitecturePipeline;
