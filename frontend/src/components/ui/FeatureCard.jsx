import React from 'react';
import { motion } from 'framer-motion';

/**
 * FeatureCard
 * Icon + title + description card with Framer Motion hover lift.
 * Used in the Features grid on the landing page (9 cards).
 */
const FeatureCard = ({ icon: Icon, title, description, index = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ duration: 0.5, delay: index * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
    whileHover={{ y: -4, scale: 1.01 }}
    className="group relative rounded-[18px] bg-white dark:bg-surface-dark border border-zinc-100 dark:border-border-dark p-6 flex flex-col gap-4 cursor-default transition-all duration-300 hover:shadow-lg dark:hover:shadow-card-dark hover:border-accent/30 dark:hover:border-accent/30"
  >
    {/* Subtle corner glow on hover */}
    <div className="absolute inset-0 rounded-[18px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
         style={{ background: 'radial-gradient(ellipse at top left, rgba(34,197,94,0.06) 0%, transparent 70%)' }} />

    <div className="relative w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent flex-shrink-0 group-hover:bg-accent/15 transition-colors duration-200">
      {Icon && <Icon className="w-5 h-5" strokeWidth={1.8} />}
    </div>

    <div className="relative">
      <h3 className="font-heading font-semibold text-[15px] text-txt-primary-light dark:text-txt-primary-dark mb-2 leading-snug">
        {title}
      </h3>
      <p className="text-sm text-txt-secondary-light dark:text-txt-secondary-dark leading-relaxed">
        {description}
      </p>
    </div>
  </motion.div>
);

export default FeatureCard;
