import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API } from '../App';
import { Navigation } from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Search, MapPin, Users, Heart, Filter, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageWrapper, PageContent } from '../components/layout/PageWrapper';
import { GridItem } from '../components/animations/AnimatedComponents';
import { AnimatedFollowButton } from '../components/animations/AnimatedButtons';
const NGODirectory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ngos, setNgos] = useState([]);
  const [filteredNgos, setFilteredNgos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState('followers');
  const [loading, setLoading] = useState(true);
  const [followingStatus, setFollowingStatus] = useState({});
  const categories = [
    'all',
    'Education',
    'Healthcare',
    'Environment',
    'Animal Welfare',
    'Poverty Alleviation',
    'Disaster Relief',
    'Women Empowerment',
    'Child Welfare',
    'Other'
  ];
  useEffect(() => {
    fetchNGOs();
  }, []);
  useEffect(() => {
    filterAndSortNGOs();
  }, [ngos, searchQuery, categoryFilter, locationFilter, sortBy]);
  const fetchNGOs = async () => {
    try {
      const response = await axios.get(`${API}/ngos`);
      setNgos(response.data.ngos || []);
      const statuses = {};
      for (const ngo of response.data.ngos || []) {
        try {
          const followRes = await axios.get(`${API}/ngos/${ngo.id}/is-following`);
          statuses[ngo.id] = followRes.data.following;
        } catch (error) {
          statuses[ngo.id] = false;
        }
      }
      setFollowingStatus(statuses);
    } catch (error) {
      toast.error('Failed to load NGOs');
      setNgos([]); 
    } finally {
      setLoading(false);
    }
  };
  const filterAndSortNGOs = () => {
    let filtered = [...ngos];
    if (searchQuery) {
      filtered = filtered.filter(ngo =>
        ngo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ngo.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(ngo => ngo.category === categoryFilter);
    }
    if (locationFilter) {
      filtered = filtered.filter(ngo =>
        ngo.location && ngo.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }
    filtered.sort((a, b) => {
      if (sortBy === 'followers') {
        return (b.followers_count || 0) - (a.followers_count || 0);
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'newest') {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      return 0;
    });
    setFilteredNgos(filtered);
  };
  const handleFollow = async (ngoId) => {
    try {
      const isFollowing = followingStatus[ngoId];
      if (isFollowing) {
        await axios.delete(`${API}/ngos/${ngoId}/follow`);
        toast.success('Unfollowed NGO');
      } else {
        await axios.post(`${API}/ngos/${ngoId}/follow`);
        toast.success('Following NGO');
      }
      setFollowingStatus(prev => ({
        ...prev,
        [ngoId]: !isFollowing
      }));
      setNgos(prev => prev.map(ngo => {
        if (ngo.id === ngoId) {
          return {
            ...ngo,
            followers_count: isFollowing
              ? (ngo.followers_count || 1) - 1
              : (ngo.followers_count || 0) + 1
          };
        }
        return ngo;
      }));
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-purple-950/30 dark:to-slate-900">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse text-lg bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 bg-clip-text text-transparent">Loading NGOs...</div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-purple-950/30 dark:to-slate-900">
      {}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 right-10 w-80 h-80 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 left-10 w-96 h-96 bg-gradient-to-br from-blue-400/15 to-cyan-400/15 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      <Navigation />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-bold mb-3 heading-font bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 bg-clip-text text-transparent">NGO Directory</h1>
          <p className="text-lg text-muted-foreground">Discover and support amazing organizations making a difference</p>
        </motion.div>
        {}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mb-8"
        >
          <Card className="glass-card-strong border-white/20 shadow-lg">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search NGOs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-11 rounded-xl border-white/20 glass-input"
                  />
                </div>
                {}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-11 rounded-xl border-white/20 glass-input">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="glass-card-strong rounded-xl">
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat === 'all' ? 'All Categories' : cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {}
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Location..."
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="pl-9 h-11 rounded-xl border-white/20 glass-input"
                  />
                </div>
                {}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-11 rounded-xl border-white/20 glass-input">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="glass-card-strong rounded-xl">
                    <SelectItem value="followers">Most Followers</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        {}
        <div className="mb-6 flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            Showing <span className="text-primary font-bold">{filteredNgos.length}</span> of <span className="font-bold">{ngos.length}</span> NGOs
          </span>
        </div>
        {}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {filteredNgos.map((ngo, index) => (
            <motion.div
              key={ngo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <Card className="glass-card-strong border-white/20 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full flex flex-col overflow-hidden">
                {}
                {ngo.cover_image && (
                  <div 
                    className="h-32 bg-cover bg-center rounded-t-lg"
                    style={{ backgroundImage: `url(${ngo.cover_image})` }}
                  />
                )}
                <CardContent className="p-6 flex-1 flex flex-col">
                  {}
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="h-16 w-16 border-2 border-background">
                      <AvatarImage src={ngo.logo} alt={ngo.name} />
                      <AvatarFallback className="text-lg">
                        {ngo.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="text-xl font-bold mb-1 heading-font truncate hover:text-primary transition-colors"
                        onClick={() => navigate(`/ngo/${ngo.id}`)}
                      >
                        {ngo.name}
                      </h3>
                      <Badge variant="secondary" className="mb-2">
                        {ngo.category}
                      </Badge>
                      {ngo.is_verified && (
                        <Badge variant="default" className="ml-2">
                          ✓ Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                  {}
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-1">
                    {ngo.description}
                  </p>
                  {}
                  <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{ngo.followers_count || 0} followers</span>
                    </div>
                    {ngo.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{ngo.location}</span>
                      </div>
                    )}
                  </div>
                  {}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleFollow(ngo.id)}
                      variant={followingStatus[ngo.id] ? "outline" : "default"}
                      className="flex-1"
                    >
                      {followingStatus[ngo.id] ? (
                        <>
                          <Heart className="h-4 w-4 mr-2 fill-current" />
                          Following
                        </>
                      ) : (
                        <>
                          <Heart className="h-4 w-4 mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => navigate(`/ngo/${ngo.id}`)}
                      variant="outline"
                    >
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        {}
        {filteredNgos.length === 0 && (
          <div className="text-center py-12">
            <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold mb-2">No NGOs Found</h3>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default NGODirectory;
