import React from 'react';
import { motion } from 'framer-motion';

/**
 * FeatureCard — compact icon + title + one-line tagline card.
 * Used in the simplified Features grid (6 cards, 3-col on desktop).
 */
const FeatureCard = ({ icon: Icon, title, tagline, index = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ duration: 0.4, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
    whileHover={{ y: -3 }}
    className="group relative rounded-[16px] bg-white dark:bg-surface-dark border border-zinc-100 dark:border-border-dark p-5 flex items-start gap-4 cursor-default transition-all duration-300 hover:border-accent/30 dark:hover:border-accent/30 hover:shadow-md dark:hover:shadow-card-dark"
  >
    {/* Corner glow */}
    <div
      className="absolute inset-0 rounded-[16px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
      style={{ background: 'radial-gradient(ellipse at top left, rgba(34,197,94,0.06) 0%, transparent 70%)' }}
    />

    {/* Icon */}
    <div className="relative flex-shrink-0 w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:bg-accent/15 transition-colors duration-200">
      {Icon && <Icon className="w-4.5 h-4.5" strokeWidth={1.8} />}
    </div>

    {/* Text */}
    <div className="relative min-w-0">
      <h3 className="font-heading font-semibold text-[14px] text-txt-primary-light dark:text-txt-primary-dark leading-snug">
        {title}
      </h3>
      <p className="mt-0.5 text-[13px] text-txt-secondary-light dark:text-txt-secondary-dark leading-snug">
        {tagline}
      </p>
    </div>
  </motion.div>
);

export default FeatureCard;
