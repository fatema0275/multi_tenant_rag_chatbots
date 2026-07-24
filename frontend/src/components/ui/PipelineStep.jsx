import React from 'react';
import { motion } from 'framer-motion';

/**
 * PipelineStep
 * One step in the "How It Works" section.
 * Renders a numbered circle, icon, title, and one-sentence description.
 */
const PipelineStep = ({ icon: Icon, step, title, description, isLast = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-30px' }}
    transition={{ duration: 0.45, delay: step * 0.1, ease: 'easeOut' }}
    className="flex flex-col items-center text-center relative"
  >
    {/* Step bubble */}
    <div className="relative mb-4">
      <div className="w-14 h-14 rounded-2xl bg-surface-dark border border-border-dark flex items-center justify-center text-accent shadow-card-dark">
        {Icon && <Icon className="w-6 h-6" strokeWidth={1.6} />}
      </div>
      {/* Step number */}
      <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-accent text-[#09090B] text-[10px] font-bold flex items-center justify-center shadow-sm">
        {step + 1}
      </div>
    </div>

    <h3 className="font-heading font-semibold text-[14px] text-txt-primary-dark mb-1.5 leading-snug max-w-[140px]">
      {title}
    </h3>
    <p className="text-[13px] text-txt-secondary-dark leading-relaxed max-w-[150px]">
      {description}
    </p>
  </motion.div>
);

export default PipelineStep;
