import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Play, ShieldCheck, Globe, Database, Bot, Brain,
  RefreshCw, MousePointerClick, BarChart3, ThumbsUp, Lock,
  FileSearch, Cpu, Layers, Zap, ArrowUpRight, Github, BookOpen,
  FileText, Mail, CheckCircle2, MessageSquare, FlaskConical,
} from 'lucide-react';

import Navbar from '../components/landing/Navbar';
import HeroDashboardMockup from '../components/landing/HeroDashboardMockup';
import FeatureCard from '../components/ui/FeatureCard';
import PipelineStep from '../components/ui/PipelineStep';
import StatCounter from '../components/ui/StatCounter';
import FAQItem from '../components/ui/FAQItem';
import TestimonialCard from '../components/ui/TestimonialCard';

// data

const HOW_IT_WORKS = [
  {
    icon: Globe,
    title: 'Register Website',
    description: 'Add your domain to your SiteMind account — no code required.',
  },
  {
    icon: ShieldCheck,
    title: 'Verify Domain Ownership',
    description: 'Prove ownership via a DNS TXT record or an uploaded verification file before any crawling starts.',
  },
  {
    icon: FileSearch,
    title: 'Automatic Crawl',
    description: 'SiteMind discovers pages via your sitemap and controlled link traversal, fully respecting robots.txt directives.',
  },
  {
    icon: Cpu,
    title: 'Content Extraction & Chunking',
    description: 'Headless rendering handles JS-heavy pages; boilerplate is stripped and content is split into semantically meaningful chunks.',
  },
  {
    icon: Database,
    title: 'Embedding & Tenant-Isolated Storage',
    description: 'Each chunk is embedded into a pgvector store with Row-Level Security enforcing strict per-tenant isolation.',
  },
  {
    icon: Bot,
    title: 'Chatbot Deployment',
    description: 'An embeddable widget goes live instantly, styled to your site\'s brand, answering only from your verified content.',
  },
];

const FEATURES = [
  {
    icon: FlaskConical,
    title: 'Entailment Verification',
    tagline: 'Every answer checked against source — no hallucinations.',
  },
  {
    icon: Lock,
    title: 'Tenant Isolation',
    tagline: 'RLS-enforced per-tenant storage — zero cross-tenant bleed.',
  },
  {
    icon: MousePointerClick,
    title: 'Visual Source Pointing',
    tagline: 'Highlights the exact paragraph the answer came from.',
  },
  {
    icon: Bot,
    title: 'Embeddable Widget',
    tagline: 'One script tag — branded and live in minutes.',
  },
  {
    icon: RefreshCw,
    title: 'Auto Sync',
    tagline: 'Re-crawls on a schedule and reprocesses only what changed.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    tagline: 'Query volume, low-confidence patterns, and crawl history.',
  },
];

const STATS = [
  { value: 4200,  suffix: '+', label: 'Websites Registered',  description: 'across all tenants'             },
  { value: 18,    suffix: 'M', label: 'Chunks Indexed',        description: 'in pgvector with RLS isolation' },
  { value: 2100,  suffix: 'K', label: 'Queries Answered',      description: 'in the last 30 days'            },
  { value: 94,    suffix: '%', label: 'Answers Verified',       description: 'pass entailment check'          },
  { value: 320,   suffix: 'ms', label: 'Avg Response Time',    description: 'end-to-end latency'             },
];

const TESTIMONIALS = [
  {
    quote: 'We integrated SiteMind on our docs portal in under an hour. The entailment filtering is the first chatbot feature that made our legal team comfortable — it simply won\'t make things up.',
    name: 'Priya Nambiar',
    role: 'Head of Product',
    company: 'Nexlyr',
    rating: 5,
  },
  {
    quote: 'Every other RAG chatbot we tried would confidently hallucinate API details. SiteMind\'s fallback mechanism caught the gaps and told users to check the docs — exactly right.',
    name: 'Marcus Osei',
    role: 'Staff Engineer',
    company: 'Stackform',
    rating: 5,
  },
  {
    quote: 'The visual pointing feature is a game-changer. Users don\'t just get an answer — they see exactly where it came from on the page. Trust went up immediately.',
    name: 'Lena Hartmann',
    role: 'CX Platform Lead',
    company: 'Kairo Labs',
    rating: 5,
  },
];

const FAQS = [
  {
    question: 'How does SiteMind verify I own a domain before crawling?',
    answer: 'You can verify ownership by adding a specific DNS TXT record to your domain\'s DNS configuration, or by uploading a small verification file to a known path on your web server. SiteMind checks for one of these before initiating any crawl — it will never crawl a site you haven\'t verified.',
  },
  {
    question: 'What exactly is "entailment verification"?',
    answer: 'After the LLM generates an answer, SiteMind runs a Natural Language Inference (NLI) model that checks whether each factual claim in the answer is actually entailed by the retrieved source chunks. If the claim is not supported — or the confidence is below the threshold — the system returns a transparent fallback message rather than serving the unverified answer.',
  },
  {
    question: 'Is content from one website ever used to answer queries for another?',
    answer: 'No. Each website\'s embeddings are stored with Row-Level Security (RLS) scoped to that tenant\'s ID at the PostgreSQL level. The retrieval layer only queries rows that belong to the requesting tenant — cross-tenant access is impossible by construction.',
  },
  {
    question: 'How does the crawler handle JavaScript-rendered content?',
    answer: 'SiteMind uses a headless browser for pages that require JavaScript to render meaningful content. Robots.txt directives are respected throughout, and the crawler applies a configurable crawl delay to avoid overloading your server.',
  },
  {
    question: 'Can I add content that isn\'t on my website?',
    answer: 'Yes. The Manual Content feature lets site owners paste or upload additional content (e.g., FAQs, internal policies) that gets chunked, embedded, and stored in the same tenant-isolated knowledge base, queryable alongside crawled content.',
  },
  {
    question: 'What happens when my site updates?',
    answer: 'SiteMind\'s sync engine periodically re-crawls your site, hashes page content, and reprocesses only what has changed. Each sync run is logged with pages checked, updated, added, and removed counts — visible in your dashboard\'s sync history.',
  },
  {
    question: 'Can I embed the chatbot widget on any site?',
    answer: 'Yes — you receive a small script tag that loads the widget. It inherits your site\'s theme color and logo from your chatbot configuration, and queries are always scoped to your tenant\'s knowledge base.',
  },
];

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ id, children, className = '' }) => (
  <section id={id} className={`py-12 sm:py-16 ${className}`}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      {children}
    </div>
  </section>
);

const SectionLabel = ({ children }) => (
  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/8 text-accent text-xs font-semibold uppercase tracking-widest mb-5">
    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
    {children}
  </div>
);

const SectionTitle = ({ children, className = '' }) => (
  <h2 className={`font-heading font-bold text-3xl sm:text-4xl text-txt-primary-light dark:text-txt-primary-dark leading-tight ${className}`}>
    {children}
  </h2>
);

const SectionSubtitle = ({ children }) => (
  <p className="mt-4 text-[16px] text-txt-secondary-light dark:text-txt-secondary-dark max-w-2xl leading-relaxed">
    {children}
  </p>
);

// ─── Landing Page ─────────────────────────────────────────────────────────────
const Landing = () => (
  <div className="min-h-screen bg-page-light dark:bg-page-dark text-txt-primary-light dark:text-txt-primary-dark overflow-x-hidden transition-colors duration-200">
    <Navbar />

    {/* ══════════════════════════════════════════════════════════════ HERO */}
    <section className="relative pt-20 pb-10 sm:pt-24 sm:pb-12 overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 pointer-events-none"
           style={{
             backgroundImage: 'linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px)',
             backgroundSize: '60px 60px',
           }} />
      {/* Radial gradient vignette */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(34,197,94,0.06) 0%, transparent 70%)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-10">
          {/* Left copy */}
          <div className="flex-1 text-center lg:text-left">

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl leading-[1.1] tracking-tight text-zinc-900 dark:text-white"
            >
              Your website,{' '}
              <span className="text-gradient">answered accurately</span>
              {' '}— every time
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="mt-4 text-[15px] text-txt-secondary-light dark:text-txt-secondary-dark leading-relaxed max-w-lg mx-auto lg:mx-0"
            >
              Register your site, verify domain ownership, and get back a chatbot that answers
              <em> strictly</em> from your content — with every claim entailment-checked before delivery.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28 }}
              className="mt-5 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
            >
              <Link
                to="/signup"
                id="hero-cta-get-started"
                className="btn-accent px-6 py-3 text-[15px] shadow-sm hover:shadow-accent/30"
              >
                Generate Chatbot
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                id="hero-cta-demo"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[18px] border border-zinc-200 dark:border-border-dark text-txt-secondary-light dark:text-txt-secondary-dark text-[15px] font-semibold hover:border-accent/50 hover:text-accent transition-all duration-200"
                onClick={() => {}}
              >
                <Play className="w-4 h-4" />
                View Live Demo
              </button>
            </motion.div>

            {/* Trust signals */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-5 flex flex-wrap gap-x-5 gap-y-2 justify-center lg:justify-start"
            >
              {[
                'DNS-verified ownership',
                'robots.txt compliant',
                'RLS tenant isolation',
                'NLI entailment check',
              ].map((tag) => (
                <span key={tag} className="flex items-center gap-1.5 text-[13px] text-txt-secondary-light dark:text-txt-secondary-dark">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                  {tag}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right mockup */}
          <div className="flex-shrink-0 w-full lg:w-auto flex justify-center">
            <HeroDashboardMockup />
          </div>
        </div>
      </div>
    </section>

    {/* ════════════════════════════════════════════════ HOW IT WORKS */}
    <Section id="how-it-works" className="border-t border-zinc-100 dark:border-border-dark">
      <div className="text-center mb-8">
        <SectionLabel>How It Works</SectionLabel>
        <SectionTitle>From URL to live chatbot in six steps</SectionTitle>
      </div>

      {/* Steps grid with animated connectors */}
      <div className="relative">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-y-10 gap-x-4">
          {HOW_IT_WORKS.map((step, i) => (
            <PipelineStep key={step.title} {...step} step={i} isLast={i === HOW_IT_WORKS.length - 1} />
          ))}
        </div>

        {/* Connector line (hidden on small screens) */}
        <div className="hidden lg:block absolute top-7 left-[calc(100%/12)] right-[calc(100%/12)] h-px pointer-events-none"
             style={{ background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.3) 20%, rgba(34,197,94,0.3) 80%, transparent)' }} />
      </div>
    </Section>

    {/* ═══════════════════════════════════════════════════ FEATURES */}
    <Section id="features" className="border-t border-zinc-100 dark:border-border-dark">
      <div className="text-center mb-10">
        <SectionLabel>Platform Features</SectionLabel>
        <SectionTitle>Everything you need, nothing you don't.</SectionTitle>
        <SectionSubtitle>
          Six capabilities that cover the full journey from crawl to verified answer.
        </SectionSubtitle>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {FEATURES.map((feat, i) => (
          <FeatureCard key={feat.title} {...feat} index={i} />
        ))}
      </div>
    </Section>

    {/* ══════════════════════════════════════════════ ARCHITECTURE */}
    <Section id="architecture" className="border-t border-zinc-100 dark:border-border-dark">
      <div className="text-center mb-7">
        <SectionLabel>How It Works</SectionLabel>
        <SectionTitle>Up and running in four steps.</SectionTitle>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Left panel: numbered steps ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="rounded-[18px] bg-white dark:bg-surface-dark border border-zinc-100 dark:border-border-dark p-5 flex flex-col gap-3.5"
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-txt-secondary-light dark:text-txt-secondary-dark mb-0.5">Steps</div>
          {[
            { n: 1, title: 'Register your site',  sub: 'Add a domain to your SiteMind account.' },
            { n: 2, title: 'Verify ownership',     sub: 'DNS TXT record or file upload — no crawl before this.' },
            { n: 3, title: 'Crawl, chunk & embed', sub: 'Automatic ingestion into your isolated knowledge base.' },
            { n: 4, title: 'Embed the widget',     sub: 'One script tag — live, branded, answering instantly.' },
          ].map(({ n, title, sub }, i) => (
            <motion.div
              key={n}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              className="flex items-start gap-3"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[#09090B] text-[10px] font-bold shadow-sm">
                {n}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-txt-primary-light dark:text-txt-primary-dark leading-snug">{title}</div>
                <div className="text-[11px] text-txt-secondary-light dark:text-txt-secondary-dark mt-0.5 leading-snug">{sub}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Right panel: widget demo ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          className="rounded-[18px] bg-white dark:bg-surface-dark border border-zinc-100 dark:border-border-dark p-5 flex flex-col gap-3"
        >
          {/* Demo header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center">
                <Zap className="w-2.5 h-2.5 text-[#09090B]" strokeWidth={2.5} />
              </div>
              <span className="text-[12px] font-semibold text-txt-primary-light dark:text-txt-primary-dark">SiteMind Chat</span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">● Live</span>
          </div>

          {/* Chat bubbles */}
          <div className="flex flex-col gap-2 flex-1">
            {/* User message */}
            <div className="flex justify-end">
              <div className="max-w-[80%] px-3 py-2 rounded-[12px] rounded-br-sm bg-accent text-[#09090B] text-[12px] font-medium leading-snug">
                What's your refund policy?
              </div>
            </div>

            {/* AI answer */}
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mt-0.5">
                <Zap className="w-2.5 h-2.5 text-accent" strokeWidth={2.5} />
              </div>
              <div className="flex-1 rounded-[12px] rounded-tl-sm bg-zinc-50 dark:bg-[#111115] border border-zinc-100 dark:border-border-dark px-3 py-2">
                <p className="text-[12px] text-txt-primary-light dark:text-txt-primary-dark leading-snug">
                  Full refund within <strong>30 days</strong> of purchase — no questions asked.
                </p>
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-accent">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Verified from your docs</span>
                </div>
              </div>
            </div>

            {/* Second user message */}
            <div className="flex justify-end">
              <div className="max-w-[80%] px-3 py-2 rounded-[12px] rounded-br-sm bg-accent text-[#09090B] text-[12px] font-medium leading-snug">
                Does it cover digital products?
              </div>
            </div>

            {/* AI answer 2 */}
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mt-0.5">
                <Zap className="w-2.5 h-2.5 text-accent" strokeWidth={2.5} />
              </div>
              <div className="flex-1 rounded-[12px] rounded-tl-sm bg-zinc-50 dark:bg-[#111115] border border-zinc-100 dark:border-border-dark px-3 py-2">
                <p className="text-[12px] text-txt-primary-light dark:text-txt-primary-dark leading-snug">
                  Yes — the 30-day policy covers all products, including digital downloads.
                </p>
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-accent">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Verified from your docs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Input bar mockup */}
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-[10px] border border-zinc-200 dark:border-border-dark bg-zinc-50 dark:bg-[#0E0E12]">
            <MessageSquare className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
            <span className="flex-1 text-[11px] text-zinc-400">Ask a question…</span>
            <div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center">
              <ArrowRight className="w-3 h-3 text-[#09090B]" />
            </div>
          </div>
        </motion.div>

      </div>
    </Section>

    {/* ════════════════════════════════════════════════════ PRICING */}
    <Section id="pricing" className="border-t border-zinc-100 dark:border-border-dark">
      <div className="text-center mb-10">
        <SectionLabel>Pricing</SectionLabel>
        <SectionTitle>Simple, transparent pricing</SectionTitle>
        <SectionSubtitle>
          All plans include entailment verification and tenant-isolated storage.
          Scale as your site content grows — no hidden per-query fees.
        </SectionSubtitle>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {/* Starter */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="rounded-[18px] bg-white dark:bg-surface-dark border border-zinc-100 dark:border-border-dark p-7 flex flex-col gap-6"
        >
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-txt-secondary-light dark:text-txt-secondary-dark mb-3">Starter</div>
            <div className="flex items-end gap-1 mb-1">
              <span className="font-heading text-4xl font-bold text-zinc-900 dark:text-white">$0</span>
              <span className="text-txt-secondary-light dark:text-txt-secondary-dark text-sm mb-1.5">/ mo</span>
            </div>
            <p className="text-[13px] text-txt-secondary-light dark:text-txt-secondary-dark">For developers and personal projects.</p>
          </div>
          <ul className="flex flex-col gap-3 flex-1">
            {['1 website', '10,000 chunks indexed', '500 queries / month', 'Entailment verification', 'Embeddable widget'].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[13px] text-txt-secondary-light dark:text-txt-secondary-dark">
                <ShieldCheck className="w-3.5 h-3.5 text-accent flex-shrink-0" />{f}
              </li>
            ))}
          </ul>
          <Link to="/signup" id="pricing-starter-cta" className="btn-ghost py-2.5 text-[14px]">
            Get Started Free
          </Link>
        </motion.div>

        {/* Pro — highlighted */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="rounded-[18px] bg-accent/8 border border-accent/40 p-7 flex flex-col gap-6 relative overflow-hidden"
        >
          <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-accent text-[#09090B] text-[10px] font-bold uppercase tracking-wider">
            Popular
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">Pro</div>
            <div className="flex items-end gap-1 mb-1">
              <span className="font-heading text-4xl font-bold text-white">$49</span>
              <span className="text-txt-secondary-light dark:text-txt-secondary-dark text-sm mb-1.5">/ mo</span>
            </div>
            <p className="text-[13px] text-txt-secondary-light dark:text-txt-secondary-dark">For teams running production chatbots.</p>
          </div>
          <ul className="flex flex-col gap-3 flex-1">
            {['Up to 10 websites', '2M chunks indexed', 'Unlimited queries', 'Visual pointing', 'Analytics dashboard', 'Manual knowledge entries', 'Priority support'].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[13px] text-txt-secondary-light dark:text-txt-secondary-dark">
                <ShieldCheck className="w-3.5 h-3.5 text-accent flex-shrink-0" />{f}
              </li>
            ))}
          </ul>
          <Link to="/signup" id="pricing-pro-cta" className="btn-accent py-2.5 text-[14px]">
            Start Pro Trial <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Enterprise */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="rounded-[18px] bg-white dark:bg-surface-dark border border-zinc-100 dark:border-border-dark p-7 flex flex-col gap-6"
        >
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-txt-secondary-light dark:text-txt-secondary-dark mb-3">Enterprise</div>
            <div className="flex items-end gap-1 mb-1">
              <span className="font-heading text-4xl font-bold text-zinc-900 dark:text-white">Custom</span>
            </div>
            <p className="text-[13px] text-txt-secondary-light dark:text-txt-secondary-dark">For large organisations needing custom SLAs.</p>
          </div>
          <ul className="flex flex-col gap-3 flex-1">
            {['Unlimited websites', 'Unlimited chunks', 'Self-hosted option', 'Custom NLI threshold tuning', 'Dedicated pgvector cluster', 'SSO / SAML', 'SLA & dedicated support'].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[13px] text-txt-secondary-light dark:text-txt-secondary-dark">
                <ShieldCheck className="w-3.5 h-3.5 text-accent flex-shrink-0" />{f}
              </li>
            ))}
          </ul>
          <a href="mailto:enterprise@sitemind.ai" id="pricing-enterprise-cta" className="btn-ghost py-2.5 text-[14px]">
            Contact Sales
          </a>
        </motion.div>
      </div>
    </Section>

    {/* ═══════════════════════════════════════════════════════ STATS */}
    <Section id="stats" className="border-t border-zinc-100 dark:border-border-dark">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-10">
        {STATS.map((stat) => (
          <StatCounter key={stat.label} {...stat} />
        ))}
      </div>
    </Section>

    {/* ══════════════════════════════════════════ TESTIMONIALS */}
    <Section id="testimonials" className="border-t border-zinc-100 dark:border-border-dark">
      <div className="text-center mb-10">
        <SectionLabel>What teams say</SectionLabel>
        <SectionTitle>Trust from teams that ship docs</SectionTitle>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {TESTIMONIALS.map((t, i) => (
          <TestimonialCard key={t.name} {...t} index={i} />
        ))}
      </div>
    </Section>

    {/* ══════════════════════════════════════════════════════ FAQ */}
    <Section id="faq" className="border-t border-zinc-100 dark:border-border-dark">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <SectionLabel>FAQ</SectionLabel>
          <SectionTitle>Common questions</SectionTitle>
        </div>
        <div className="rounded-[18px] bg-white dark:bg-surface-dark border border-zinc-100 dark:border-border-dark px-6 divide-y divide-zinc-100 dark:divide-border-dark">
          {FAQS.map((faq, i) => (
            <FAQItem key={faq.question} {...faq} index={i} />
          ))}
        </div>
      </div>
    </Section>

    {/* ════════════════════════════════════════════════ CLOSING CTA */}
    <Section id="cta" className="border-t border-zinc-100 dark:border-border-dark">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative rounded-[24px] bg-white dark:bg-surface-dark border border-zinc-100 dark:border-border-dark p-12 sm:p-16 text-center overflow-hidden"
      >
        {/* Accent glow background */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 100%, rgba(34,197,94,0.08) 0%, transparent 70%)' }} />

        <div className="relative">
          <div className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full border border-accent/30 bg-accent/8 text-accent text-xs font-semibold">
            <Zap className="w-3 h-3" />
            No credit card required
          </div>
          <h2 className="font-heading font-bold text-4xl sm:text-5xl text-zinc-900 dark:text-white mb-5">
            Ready to build a chatbot that<br className="hidden sm:block" /> doesn't hallucinate?
          </h2>
          <p className="text-[16px] text-txt-secondary-light dark:text-txt-secondary-dark max-w-xl mx-auto mb-9">
            Register your first website, verify ownership, and have a live, entailment-verified 
            chatbot running in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/signup"
              id="cta-get-started"
              className="btn-accent px-8 py-3.5 text-[15px] shadow-sm hover:shadow-accent/30"
            >
              Generate Chatbot — It's Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-[18px] border border-zinc-200 dark:border-border-dark text-txt-secondary-light dark:text-txt-secondary-dark text-[15px] font-semibold hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-txt-primary-light dark:hover:text-txt-primary-dark transition-all duration-200"
            >
              <Github className="w-4 h-4" />
              View on GitHub
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </motion.div>
    </Section>

    {/* ════════════════════════════════════════════════════ FOOTER */}
    <footer className="border-t border-zinc-100 dark:border-border-dark bg-zinc-50 dark:bg-surface-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-[#09090B]" strokeWidth={2.5} />
              </div>
              <span className="font-heading font-bold text-zinc-900 dark:text-white">
                Site<span className="text-accent">Mind</span>
              </span>
            </div>
            <p className="text-[13px] text-txt-secondary-light dark:text-txt-secondary-dark leading-relaxed max-w-[200px]">
              Hallucination-resistant AI chatbots for any verified website.
            </p>
          </div>

          {/* Product */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-txt-secondary-light dark:text-txt-secondary-dark mb-4">Product</div>
            <div className="flex flex-col gap-2.5">
              {['Features', 'How It Works', 'Architecture', 'Pricing'].map((l) => (
                <button key={l} className="text-[13px] text-txt-secondary-light dark:text-txt-secondary-dark hover:text-txt-primary-light dark:hover:text-txt-primary-dark transition-colors text-left">
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Developers */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-txt-secondary-light dark:text-txt-secondary-dark mb-4">Developers</div>
            <div className="flex flex-col gap-2.5">
              {[
                { label: 'Documentation', icon: BookOpen },
                { label: 'API Reference', icon: FileText },
                { label: 'GitHub', icon: Github },
              ].map(({ label, icon: Icon }) => (
                <a key={label} href="#" className="flex items-center gap-1.5 text-[13px] text-txt-secondary-light dark:text-txt-secondary-dark hover:text-txt-primary-light dark:hover:text-txt-primary-dark transition-colors">
                  <Icon className="w-3 h-3" /> {label}
                </a>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-txt-secondary-light dark:text-txt-secondary-dark mb-4">Legal</div>
            <div className="flex flex-col gap-2.5">
              {[
                { label: 'Privacy Policy', icon: FileText },
                { label: 'Terms of Service', icon: FileText },
                { label: 'Contact', icon: Mail },
              ].map(({ label, icon: Icon }) => (
                <a key={label} href="#" className="flex items-center gap-1.5 text-[13px] text-txt-secondary-dark hover:text-txt-primary-dark transition-colors">
                  <Icon className="w-3 h-3" /> {label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-200 dark:border-border-dark flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-txt-secondary-light dark:text-txt-secondary-dark">
            © {new Date().getFullYear()} SiteMind. All rights reserved.
          </p>
          <p className="text-[12px] text-txt-secondary-light dark:text-txt-secondary-dark flex items-center gap-1">
            Powered by pgvector · NLI entailment · Row-Level Security
          </p>
        </div>
      </div>
    </footer>
  </div>
);

export default Landing;
