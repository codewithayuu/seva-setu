import React from 'react';
import { motion } from 'framer-motion';
import { skeletonPulse } from '../../lib/animations';
export const SkeletonCard = () => (
  <motion.div
    {...skeletonPulse}
    className="glass-card p-6 rounded-xl space-y-4"
  >
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 bg-white/20 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-white/20 rounded w-1/3" />
        <div className="h-3 bg-white/20 rounded w-1/4" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-white/20 rounded" />
      <div className="h-3 bg-white/20 rounded w-5/6" />
    </div>
  </motion.div>
);
export const SkeletonText = ({ lines = 3, className = '' }) => (
  <motion.div {...skeletonPulse} className={`space-y-2 ${className}`}>
    {[...Array(lines)].map((_, i) => (
      <div
        key={i}
        className="h-4 bg-white/20 rounded"
        style={{ width: i === lines - 1 ? '80%' : '100%' }}
      />
    ))}
  </motion.div>
);
export const SkeletonAvatar = ({ size = 'md' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };
  return (
    <motion.div
      {...skeletonPulse}
      className={`${sizes[size]} bg-white/20 rounded-full`}
    />
  );
};
export const SkeletonButton = ({ className = '' }) => (
  <motion.div
    {...skeletonPulse}
    className={`h-10 bg-white/20 rounded-full ${className}`}
  />
);