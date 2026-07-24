import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/**
 * StatCounter
 * Animates a number from 0 → target when it scrolls into view.
 * Supports suffix (e.g. "ms", "%", "+") and comma formatting.
 */
const StatCounter = ({ value, suffix = '', label, description }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1800;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    let frame = 0;

    const timer = setInterval(() => {
      frame++;
      // Ease-out cubic
      const progress = frame / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      current = Math.round(value * eased);
      setCount(current);
      if (frame >= steps) {
        clearInterval(timer);
        setCount(value);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [inView, value]);

  const formatted = count.toLocaleString();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex flex-col items-center text-center"
    >
      <div className="font-heading text-4xl sm:text-5xl font-bold text-txt-primary-dark tabular-nums leading-none mb-1">
        {formatted}
        <span className="text-accent ml-1">{suffix}</span>
      </div>
      <div className="text-[15px] font-semibold text-txt-primary-dark mt-3 mb-1">{label}</div>
      {description && (
        <div className="text-xs text-txt-secondary-dark max-w-[160px] leading-relaxed">{description}</div>
      )}
    </motion.div>
  );
};

export default StatCounter;
