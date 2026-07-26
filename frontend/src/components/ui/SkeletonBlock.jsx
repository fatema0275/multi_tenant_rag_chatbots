import React from 'react';
import { motion } from 'framer-motion';

/**
 * SkeletonBlock
 * Reusable shimmer placeholder for loading states.
 * Renders as an animated rectangle. Pass width/height via className.
 */
const SkeletonBlock = ({ className = '', rounded = 'rounded-lg' }) => (
  <motion.div
    initial={{ opacity: 0.6 }}
    animate={{ opacity: [0.6, 1, 0.6] }}
    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    className={`skeleton-light dark:skeleton ${rounded} ${className}`}
    aria-hidden="true"
  />
);

export default SkeletonBlock;
