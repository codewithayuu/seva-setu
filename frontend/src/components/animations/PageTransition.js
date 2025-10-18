import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageTransition } from '../../lib/animations';
export const PageTransition = ({ children, key }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial={pageTransition.initial}
        animate={pageTransition.animate}
        exit={pageTransition.exit}
        transition={pageTransition.transition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};