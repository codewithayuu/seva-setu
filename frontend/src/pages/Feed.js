import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API } from '../App';
import { Navigation } from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Heart, MessageCircle, Share2, Send, Calendar, TrendingUp, BarChart3, Edit2, Trash2, Plus, X, RefreshCw, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { ImageUpload } from '../components/ImageUpload';
import { BackToTop } from '../components/animations/BackToTop';
import { PullToRefresh } from '../components/mobile/PullToRefresh';
import { AnimatedLikeButton } from '../components/animations/AnimatedButtons';
import { AnimatedCard, ScrollAnimation } from '../components/animations/AnimatedComponents';
const Feed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [postImages, setPostImages] = useState([]);
  const [showPollCreation, setShowPollCreation] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastPostIdRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  useEffect(() => {
    fetchPosts();
    fetchEvents();
    refreshIntervalRef.current = setInterval(() => {
      checkForNewPosts();
    }, 30000);
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);
  const checkForNewPosts = async () => {
    try {
      const response = await axios.get(`${API}/posts`);
      const latestPosts = response.data;
      if (latestPosts.length > 0 && lastPostIdRef.current) {
        const hasNew = latestPosts[0].id !== lastPostIdRef.current;
        if (hasNew) {
          setHasNewPosts(true);
        }
      }
    } catch (error) {
    }
  };
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPosts();
    await fetchEvents();
    setHasNewPosts(false);
    setIsRefreshing(false);
    toast.success('Feed refreshed!');
  };
  const fetchPosts = async () => {
    try {
      const response = await axios.get(`${API}/posts`);
      setPosts(response.data.posts || []);
      if (response.data.posts && response.data.posts.length > 0) {
        lastPostIdRef.current = response.data.posts[0].id;
      }
    } catch (error) {
    }
  };
  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/events?limit=5`);
      setEvents(response.data.events || []);
    } catch (error) {
    }
  };
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim() && postImages.length === 0 && !pollQuestion) return;
    setLoading(true);
    try {
      const postData = {
        content: newPost,
        images: postImages,
      };
      if (showPollCreation && pollQuestion) {
        postData.poll = {
          question: pollQuestion,
          options: pollOptions.filter(opt => opt.trim()).map(opt => ({ text: opt, votes: 0 }))
        };
      }
      await axios.post(`${API}/posts`, postData);
      setNewPost('');
      setPostImages([]);
      setPollQuestion('');
      setPollOptions(['', '']);
      setShowPollCreation(false);
      fetchPosts();
      toast.success('Post created!');
    } catch (error) {
      toast.error('Failed to create post');
    } finally {
      setLoading(false);
    }
  };
  const handleEditPost = async (postId, content, images) => {
    try {
      await axios.patch(`${API}/posts/${postId}`, { content, images });
      setEditingPost(null);
      fetchPosts();
      toast.success('Post updated!');
    } catch (error) {
      toast.error('Failed to update post');
    }
  };
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await axios.delete(`${API}/posts/${postId}`);
      fetchPosts();
      toast.success('Post deleted!');
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };
  const handleLike = async (postId) => {
    try {
      await axios.post(`${API}/posts/${postId}/like`);
      fetchPosts();
    } catch (error) {
      toast.error('Failed to like post');
    }
  };
  const handleVote = async (postId, optionIndex) => {
    try {
      await axios.post(`${API}/posts/${postId}/poll/vote`, { option_index: optionIndex });
      fetchPosts();
      toast.success('Vote recorded!');
    } catch (error) {
      toast.error('Failed to vote');
    }
  };
  const addPollOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, '']);
    }
  };
  const removePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };
  const PostEditDialog = ({ post, onClose }) => {
    const [editContent, setEditContent] = useState(post.content);
    const [editImages, setEditImages] = useState(post.images || []);
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[120px]"
              placeholder="What's on your mind?"
            />
            <ImageUpload
              onImagesChange={setEditImages}
              multiple={true}
              maxImages={5}
              existingImages={editImages}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => handleEditPost(post.id, editContent, editImages)}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-purple-950/30 dark:to-slate-900">
      {}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      <Navigation />
      {}
      <AnimatePresence>
        {hasNewPosts && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-24 left-1/2 transform -translate-x-1/2 z-40"
          >
            <Button
              onClick={handleRefresh}
              className="shadow-xl bg-primary hover:bg-primary/90 flex items-center gap-2 rounded-full"
            >
              <Bell className="h-4 w-4" />
              New posts available
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      {}
      <BackToTop />
      {}
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="relative mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl pt-24 pb-12 lg:pb-12 pb-20">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {}
          <div className="lg:col-span-8 space-y-6">
            {}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 rounded-full border-white/20 hover:bg-white/10"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            {}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-white/20 shadow-lg" data-testid="create-post-card">
                <CardContent className="pt-6">
                  <form onSubmit={handleCreatePost}>
                    <div className="flex gap-4">
                      <Avatar>
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-3">
                        <Textarea
                          placeholder="Share your impact story..."
                          value={newPost}
                          onChange={(e) => setNewPost(e.target.value)}
                          className="min-h-[100px] resize-none"
                          data-testid="post-textarea"
                        />
                        <ImageUpload
                          onImagesChange={setPostImages}
                          multiple={true}
                          maxImages={5}
                          existingImages={postImages}
                        />
                        {showPollCreation && (
                          <div className="space-y-3 p-4 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm">Create Poll</h4>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setShowPollCreation(false);
                                  setPollQuestion('');
                                  setPollOptions(['', '']);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <Input
                              placeholder="Poll question"
                              value={pollQuestion}
                              onChange={(e) => setPollQuestion(e.target.value)}
                            />
                            <div className="space-y-2">
                              {pollOptions.map((option, index) => (
                                <div key={index} className="flex gap-2">
                                  <Input
                                    placeholder={`Option ${index + 1}`}
                                    value={typeof option === 'string' ? option : option.text || ''}
                                    onChange={(e) => {
                                      const newOptions = [...pollOptions];
                                      newOptions[index] = e.target.value;
                                      setPollOptions(newOptions);
                                    }}
                                  />
                                  {pollOptions.length > 2 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removePollOption(index)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                            {pollOptions.length < 5 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addPollOption}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Option
                              </Button>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPollCreation(!showPollCreation)}
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            {showPollCreation ? 'Remove Poll' : 'Add Poll'}
                          </Button>
                          <Button
                            type="submit"
                            disabled={loading || (!newPost.trim() && postImages.length === 0 && !pollQuestion)}
                            data-testid="create-post-button"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Post
                          </Button>
                        </div>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
            {}
            <div className="space-y-6">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <Card className="border-white/20 shadow-lg hover:shadow-xl transition-shadow duration-300" data-testid="feed-post-card">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <Avatar>
                          <AvatarImage src={post.author_avatar} />
                          <AvatarFallback>{post.author_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="heading-font font-semibold text-sm">{post.author_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(post.created_at), 'PPp')}
                              </p>
                            </div>
                            {post.author_id === user?.id && (
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingPost(post)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeletePost(post.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm md:text-base mb-4 whitespace-pre-wrap">{post.content}</p>
                      {}
                      {post.images && post.images.length > 0 && (
                        <div className={`grid gap-2 mb-4 ${
                          post.images.length === 1 ? 'grid-cols-1' : 
                          post.images.length === 2 ? 'grid-cols-2' : 
                          'grid-cols-2 sm:grid-cols-3'
                        }`}>
                          {post.images.map((img, idx) => (
                            <motion.img
                              key={idx}
                              src={img}
                              alt={`Post image ${idx + 1}`}
                              className="rounded-lg w-full h-48 object-cover shadow-md"
                              whileHover={{ scale: 1.02, shadow: "0 10px 30px rgba(0,0,0,0.2)" }}
                              transition={{ duration: 0.2 }}
                            />
                          ))}
                        </div>
                      )}
                      {}
                      {post.poll && (
                        <div className="space-y-2 mb-4 p-4 border rounded-lg">
                          <h4 className="font-semibold text-sm">{post.poll.question}</h4>
                          <div className="space-y-2">
                            {post.poll.options.map((option, idx) => {
                              const totalVotes = post.poll.options.reduce((sum, opt) => sum + opt.votes, 0);
                              const percentage = totalVotes > 0 ? (option.votes / totalVotes * 100).toFixed(1) : 0;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleVote(post.id, idx)}
                                  className="w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors relative overflow-hidden"
                                >
                                  <div
                                    className="absolute inset-0 bg-primary/10 transition-all"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                  <div className="relative flex justify-between items-center">
                                    <span className="text-sm">{option.text}</span>
                                    <span className="text-sm font-semibold">{percentage}%</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {post.poll.options.reduce((sum, opt) => sum + opt.votes, 0)} votes
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-4 pt-4 border-t">
                        <AnimatedLikeButton
                          isLiked={post.liked_by_user}
                          onLike={() => handleLike(post.id)}
                          likesCount={post.likes_count}
                          data-testid="feed-like-button"
                        />
                        <Button variant="ghost" size="sm" data-testid="feed-comment-button">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          {post.comments_count}
                        </Button>
                        <Button variant="ghost" size="sm" data-testid="feed-share-button">
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              {posts.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          {}
          <div className="lg:col-span-4 space-y-6 mt-6 lg:mt-0">
            {}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Card className="border-white/20 shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h3 className="heading-font font-semibold">Upcoming Events</h3>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {events.slice(0, 3).map((event) => (
                    <div key={event.id} className="flex gap-3 p-3 rounded-xl hover:bg-white/5 transition-all duration-200 cursor-pointer group" data-testid="sidebar-event-item">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex flex-col items-center justify-center group-hover:scale-110 transition-transform duration-200">
                          <span className="text-xs font-medium text-primary">
                            {format(new Date(event.date), 'MMM')}
                          </span>
                          <span className="text-lg font-bold text-primary">
                            {format(new Date(event.date), 'd')}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="heading-font text-sm font-semibold truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{event.ngo_name}</p>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {event.volunteers_registered}/{event.volunteers_needed} volunteers
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {events.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
            {}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card className="border-white/20 shadow-lg bg-gradient-to-br from-purple-500/5 to-pink-500/5">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-[hsl(var(--brand-accent))]" />
                    <h3 className="heading-font font-semibold">Your Impact</h3>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                      <span className="text-sm text-muted-foreground">Volunteer Hours</span>
                      <span className="heading-font text-2xl font-bold text-primary">0</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                      <span className="text-sm text-muted-foreground">Events Attended</span>
                      <span className="heading-font text-2xl font-bold text-[hsl(var(--brand-accent))]">0</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                      <span className="text-sm text-muted-foreground">Lives Impacted</span>
                      <span className="heading-font text-2xl font-bold text-[hsl(var(--brand-support))]">0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
      </PullToRefresh>
      {}
      {editingPost && (
        <PostEditDialog
          post={editingPost}
          onClose={() => setEditingPost(null)}
        />
      )}
    </div>
  );
};
export default Feed;
