import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

/**
 * TestimonialCard
 * Avatar + quote + name/role card with entrance animation.
 */
const TestimonialCard = ({ quote, name, role, company, rating = 5, index = 0 }) => {
  // Generate deterministic initials avatar colours
  const colors = ['#22C55E', '#6366F1', '#F59E0B', '#3B82F6', '#EC4899'];
  const color = colors[index % colors.length];
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.12, ease: 'easeOut' }}
      className="rounded-[18px] bg-white dark:bg-surface-dark border border-zinc-100 dark:border-border-dark p-6 flex flex-col gap-4 shadow-card dark:shadow-card-dark"
    >
      {/* Stars */}
      <div className="flex gap-0.5">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
        ))}
      </div>

      {/* Quote */}
      <p className="text-sm text-txt-secondary-light dark:text-txt-secondary-dark leading-relaxed flex-1">
        "{quote}"
      </p>

      {/* Author */}
      <div className="flex items-center gap-3 pt-2 border-t border-zinc-100 dark:border-border-dark">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-[#09090B] flex-shrink-0"
          style={{ background: color }}
        >
          {initials}
        </div>
        <div>
          <div className="text-sm font-semibold text-txt-primary-light dark:text-txt-primary-dark">{name}</div>
          <div className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark">
            {role}{company ? `, ${company}` : ''}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TestimonialCard;
