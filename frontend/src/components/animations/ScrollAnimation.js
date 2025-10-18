import React from 'react';
import { motion } from 'framer-motion';
import { scrollFadeIn } from '../../lib/animations';
export const ScrollAnimation = ({ children, delay = 0, className = '' }) => {
  return (
    <motion.div
      {...scrollFadeIn(delay)}
      className={className}
    >
      {children}
    </motion.div>
  );
};