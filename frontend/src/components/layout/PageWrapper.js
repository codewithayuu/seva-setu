import React from 'react';
import { motion } from 'framer-motion';
import { BackToTop } from '../animations/BackToTop';
import { PullToRefresh } from '../mobile/PullToRefresh';
import { pageTransition } from '../../lib/animations';
export const PageWrapper = ({ 
  children, 
  onRefresh,
  showBackToTop = true,
  enablePullToRefresh = true,
  className = ''
}) => {
  const content = (
    <motion.div
      {...pageTransition}
      className={`min-h-screen ${className}`}
    >
      {children}
      {showBackToTop && <BackToTop />}
    </motion.div>
  );
  if (enablePullToRefresh && onRefresh) {
    return (
      <PullToRefresh onRefresh={onRefresh}>
        {content}
      </PullToRefresh>
    );
  }
  return content;
};
export const PageContent = ({ children, className = '' }) => {
  return (
    <div className={`relative mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl pt-20 lg:pt-24 pb-24 lg:pb-12 ${className}`}>
      {children}
    </div>
  );
};