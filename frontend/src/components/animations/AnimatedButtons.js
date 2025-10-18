import React from 'react';
import { motion } from 'framer-motion';
import { likeAnimation, buttonPress } from '../../lib/animations';
import { Button } from '../ui/button';
import { Heart } from 'lucide-react';
export const AnimatedLikeButton = ({ isLiked, onLike, likesCount, ...props }) => {
  return (
    <motion.div
      initial="initial"
      animate={isLiked ? 'liked' : 'initial'}
      variants={likeAnimation}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onLike}
        className={`gap-2 ${isLiked ? 'text-red-500' : ''}`}
        {...props}
      >
        <motion.div
          whileTap={{ scale: 0.8 }}
          transition={{ duration: 0.1 }}
        >
          <Heart
            className="h-4 w-4"
            fill={isLiked ? 'currentColor' : 'none'}
          />
        </motion.div>
        {likesCount > 0 && <span>{likesCount}</span>}
      </Button>
    </motion.div>
  );
};
export const AnimatedButton = ({ children, ...props }) => {
  return (
    <motion.div
      whileTap={buttonPress}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      <Button {...props}>{children}</Button>
    </motion.div>
  );
};
export const AnimatedFollowButton = ({ isFollowing, onFollow, ...props }) => {
  return (
    <motion.div
      initial={{ scale: 1 }}
      animate={{ scale: isFollowing ? [1, 1.1, 1] : 1 }}
      transition={{ duration: 0.3 }}
    >
      <Button
        onClick={onFollow}
        variant={isFollowing ? 'outline' : 'default'}
        className={`rounded-full ${!isFollowing ? 'bg-gradient-to-r from-purple-600 to-pink-600' : ''}`}
        {...props}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </Button>
    </motion.div>
  );
};