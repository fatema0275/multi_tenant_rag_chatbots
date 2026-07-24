import React from 'react';

const VARIANTS = {
  verified:  { bg: 'bg-accent/10',           text: 'text-accent',      dot: 'bg-accent',         label: 'Verified'  },
  pending:   { bg: 'bg-amber-500/10',         text: 'text-amber-400',   dot: 'bg-amber-400',      label: 'Pending'   },
  failed:    { bg: 'bg-red-500/10',           text: 'text-red-400',     dot: 'bg-red-400',         label: 'Failed'    },
  active:    { bg: 'bg-accent/10',            text: 'text-accent',      dot: 'bg-accent',         label: 'Active'    },
  crawling:  { bg: 'bg-blue-500/10',          text: 'text-blue-400',    dot: 'bg-blue-400',       label: 'Crawling'  },
  idle:      { bg: 'bg-zinc-500/10',          text: 'text-zinc-400',    dot: 'bg-zinc-400',       label: 'Idle'      },
  deployed:  { bg: 'bg-accent/10',            text: 'text-accent',      dot: 'bg-accent',         label: 'Deployed'  },
};

/**
 * Badge
 * Small status chip with dot indicator.
 * @param {string} variant - one of the VARIANTS keys
 * @param {string} [label] - override the default label
 * @param {string} [className]
 */
const Badge = ({ variant = 'idle', label, className = '' }) => {
  const v = VARIANTS[variant] || VARIANTS.idle;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${v.bg} ${v.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
      {label || v.label}
    </span>
  );
};

export default Badge;
