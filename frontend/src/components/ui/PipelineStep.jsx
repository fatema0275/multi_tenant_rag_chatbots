import React from 'react';
import { motion } from 'framer-motion';

/**
 * PipelineStep
 * One step in the "How It Works" section.
 * Renders a numbered circle, icon, and title only — no description paragraph.
 */
const PipelineStep = ({ icon: Icon, step, title, isLast = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-30px' }}
    transition={{ duration: 0.45, delay: step * 0.1, ease: 'easeOut' }}
    className="flex flex-col items-center text-center relative"
  >
    {/* Step bubble */}
    <div className="relative mb-5">
      <div className="w-14 h-14 rounded-2xl bg-white dark:bg-surface-dark border border-zinc-200 dark:border-border-dark flex items-center justify-center text-accent shadow-card dark:shadow-card-dark transition-colors duration-200">
        {Icon && <Icon className="w-6 h-6" strokeWidth={1.6} />}
      </div>
      {/* Step number */}
      <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-accent text-[#09090B] text-[10px] font-bold flex items-center justify-center shadow-sm">
        {step + 1}
      </div>
    </div>

    <h3 className="font-heading font-semibold text-[13px] text-txt-primary-light dark:text-txt-primary-dark leading-snug max-w-[130px]">
      {title}
    </h3>
  </motion.div>
);

export default PipelineStep;
