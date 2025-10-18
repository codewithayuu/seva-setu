import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
export const PullToRefresh = ({ onRefresh, children }) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const maxPullDistance = 120;
  const threshold = 80;
  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  };
  const handleTouchMove = (e) => {
    if (startY.current === 0 || window.scrollY > 0) return;
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;
    if (distance > 0) {
      e.preventDefault();
      const pull = Math.min(distance * 0.5, maxPullDistance);
      setPullDistance(pull);
      setIsPulling(true);
    }
  };
  const handleTouchEnd = async () => {
    if (pullDistance >= threshold) {
      await onRefresh();
    }
    setIsPulling(false);
    setPullDistance(0);
    startY.current = 0;
  };
  const rotation = (pullDistance / maxPullDistance) * 360;
  const opacity = Math.min(pullDistance / threshold, 1);
  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {}
      <motion.div
        className="absolute top-0 left-1/2 transform -translate-x-1/2 z-50"
        style={{
          y: pullDistance - 50,
          opacity: opacity
        }}
      >
        <div className="glass-card-strong rounded-full p-3 shadow-lg">
          <motion.div
            style={{ rotate: rotation }}
          >
            <RefreshCw className="h-6 w-6 text-purple-600" />
          </motion.div>
        </div>
      </motion.div>
      {}
      <motion.div
        animate={{
          y: isPulling ? pullDistance * 0.5 : 0
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        {children}
      </motion.div>
    </div>
  );
};