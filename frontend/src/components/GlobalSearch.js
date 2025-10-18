import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { 
  Search, X, TrendingUp, Calendar, Users, MapPin, 
  Filter, Bookmark, History, Clock, Star 
} from 'lucide-react';
import { toast } from 'sonner';
export const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({
    ngos: [],
    people: [],
    events: [],
    posts: []
  });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all', 
    location: '',
    category: '',
    dateRange: 'all' 
  });
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('savedSearches') || '[]');
    const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    setSavedSearches(saved);
    setRecentSearches(recent);
  }, []);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  useEffect(() => {
    if (query.length >= 2) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        performSearch(query);
        trackSearchAnalytics(query);
      }, 300);
    } else {
      setResults({ ngos: [], people: [], events: [], posts: [] });
      loadSuggestions();
    }
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, filters]);
  const loadSuggestions = async () => {
    try {
      const trending = ['education', 'environment', 'healthcare', 'women empowerment'];
      setSuggestions(trending);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };
  const performSearch = async (searchQuery) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        type: filters.type,
        location: filters.location,
        category: filters.category,
        dateRange: filters.dateRange
      });
      const response = await axios.get(`${API}/search?${params}`);
      setResults(response.data);
      addToRecentSearches(searchQuery);
    } catch (error) {
      console.error('Search error:', error);
      await fallbackSearch(searchQuery);
    } finally {
      setLoading(false);
    }
  };
  const fallbackSearch = async (searchQuery) => {
    try {
      const [ngosRes, eventsRes, postsRes] = await Promise.all([
        axios.get(`${API}/ngos`).catch(() => ({ data: [] })),
        axios.get(`${API}/events`).catch(() => ({ data: [] })),
        axios.get(`${API}/posts`).catch(() => ({ data: [] }))
      ]);
      const lowerQuery = searchQuery.toLowerCase();
      setResults({
        ngos: (ngosRes.data.ngos || []).filter(ngo => 
          ngo.name?.toLowerCase().includes(lowerQuery) ||
          ngo.description?.toLowerCase().includes(lowerQuery) ||
          ngo.category?.toLowerCase().includes(lowerQuery)
        ).slice(0, 5),
        people: [], 
        events: (eventsRes.data.events || []).filter(event => 
          event.title?.toLowerCase().includes(lowerQuery) ||
          event.description?.toLowerCase().includes(lowerQuery) ||
          event.category?.toLowerCase().includes(lowerQuery)
        ).slice(0, 5),
        posts: (postsRes.data.posts || []).filter(post => 
          post.content?.toLowerCase().includes(lowerQuery)
        ).slice(0, 5)
      });
    } catch (error) {
      console.error('Fallback search error:', error);
      toast.error('Search failed. Please try again.');
    }
  };
  const addToRecentSearches = (searchQuery) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };
  const saveSearch = () => {
    if (!query) return;
    const search = {
      query,
      filters: { ...filters },
      timestamp: new Date().toISOString()
    };
    const updated = [search, ...savedSearches].slice(0, 20);
    setSavedSearches(updated);
    localStorage.setItem('savedSearches', JSON.stringify(updated));
    toast.success('Search saved!');
  };
  const loadSavedSearch = (search) => {
    setQuery(search.query);
    setFilters(search.filters);
  };
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };
  const trackSearchAnalytics = async (searchQuery) => {
    try {
      await axios.post(`${API}/analytics/search`, {
        query: searchQuery,
        filters,
        timestamp: new Date().toISOString(),
        results_count: Object.values(results).reduce((acc, arr) => acc + arr.length, 0)
      }).catch(() => {});
    } catch (error) {
    }
  };
  const handleResultClick = (type, item) => {
    setIsOpen(false);
    setQuery('');
    switch(type) {
      case 'ngo':
        navigate(`/ngo/${item.id}`);
        break;
      case 'event':
        navigate(`/events`);
        break;
      case 'post':
        navigate(`/feed`);
        break;
      case 'person':
        navigate(`/profile/${item.id}`);
        break;
      default:
        break;
    }
  };
  const totalResults = Object.values(results).reduce((acc, arr) => acc + arr.length, 0);
  return (
    <div ref={searchRef} className="relative w-full max-w-xl">
      {}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search NGOs, events, posts, people..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-20 h-10"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQuery('')}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-6 w-6 p-0 ${showFilters ? 'text-primary' : ''}`}
          >
            <Filter className="h-3 w-3" />
          </Button>
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={saveSearch}
              className="h-6 w-6 p-0"
            >
              <Bookmark className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      {}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 p-4 bg-card border rounded-lg shadow-lg"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({...filters, type: e.target.value})}
                  className="w-full p-2 border rounded text-sm"
                >
                  <option value="all">All</option>
                  <option value="ngos">NGOs</option>
                  <option value="events">Events</option>
                  <option value="posts">Posts</option>
                  <option value="people">People</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                  className="w-full p-2 border rounded text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Location</label>
                <Input
                  value={filters.location}
                  onChange={(e) => setFilters({...filters, location: e.target.value})}
                  placeholder="City or region"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Category</label>
                <Input
                  value={filters.category}
                  onChange={(e) => setFilters({...filters, category: e.target.value})}
                  placeholder="e.g., Education"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-lg shadow-xl z-50 max-h-[600px] overflow-hidden"
          >
            <ScrollArea className="h-full max-h-[600px]">
              <div className="p-4">
                {}
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                )}
                {}
                {!query && !loading && (
                  <div className="space-y-4">
                    {}
                    {suggestions.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <h3 className="text-sm font-semibold">Trending</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {suggestions.map((suggestion, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="cursor-pointer hover:bg-secondary/80"
                              onClick={() => setQuery(suggestion)}
                            >
                              {suggestion}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {}
                    {recentSearches.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <History className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold">Recent Searches</h3>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearRecentSearches}
                            className="h-6 text-xs"
                          >
                            Clear
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {recentSearches.slice(0, 5).map((search, idx) => (
                            <div
                              key={idx}
                              onClick={() => setQuery(search)}
                              className="flex items-center gap-2 p-2 hover:bg-secondary rounded cursor-pointer"
                            >
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{search}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {}
                    {savedSearches.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="h-4 w-4 text-muted-foreground" />
                          <h3 className="text-sm font-semibold">Saved Searches</h3>
                        </div>
                        <div className="space-y-1">
                          {savedSearches.slice(0, 5).map((search, idx) => (
                            <div
                              key={idx}
                              onClick={() => loadSavedSearch(search)}
                              className="flex items-center gap-2 p-2 hover:bg-secondary rounded cursor-pointer"
                            >
                              <Bookmark className="h-3 w-3 text-muted-foreground" />
                              <div className="flex-1">
                                <span className="text-sm font-medium">{search.query}</span>
                                {search.filters.category && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {search.filters.category}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {}
                {query && !loading && totalResults > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Found {totalResults} result{totalResults !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {}
                    {results.ngos.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-semibold">NGOs</h3>
                          <Badge variant="secondary">{results.ngos.length}</Badge>
                        </div>
                        <div className="space-y-1">
                          {results.ngos.map((ngo) => (
                            <div
                              key={ngo.id}
                              onClick={() => handleResultClick('ngo', ngo)}
                              className="p-3 hover:bg-secondary rounded-lg cursor-pointer transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                {ngo.logo && (
                                  <img src={ngo.logo} alt={ngo.name} className="w-10 h-10 rounded-full object-cover" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium truncate">{ngo.name}</h4>
                                  <p className="text-xs text-muted-foreground line-clamp-1">{ngo.description}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {ngo.category && (
                                      <Badge variant="outline" className="text-xs">{ngo.category}</Badge>
                                    )}
                                    {ngo.location && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {ngo.location}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {}
                    {results.events.length > 0 && (
                      <div>
                        <Separator className="my-3" />
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-semibold">Events</h3>
                          <Badge variant="secondary">{results.events.length}</Badge>
                        </div>
                        <div className="space-y-1">
                          {results.events.map((event) => (
                            <div
                              key={event.id}
                              onClick={() => handleResultClick('event', event)}
                              className="p-3 hover:bg-secondary rounded-lg cursor-pointer transition-colors"
                            >
                              <h4 className="text-sm font-medium">{event.title}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-1">{event.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {event.category && (
                                  <Badge variant="outline" className="text-xs">{event.category}</Badge>
                                )}
                                {event.date && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(event.date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {}
                    {results.posts.length > 0 && (
                      <div>
                        <Separator className="my-3" />
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-semibold">Posts</h3>
                          <Badge variant="secondary">{results.posts.length}</Badge>
                        </div>
                        <div className="space-y-1">
                          {results.posts.map((post) => (
                            <div
                              key={post.id}
                              onClick={() => handleResultClick('post', post)}
                              className="p-3 hover:bg-secondary rounded-lg cursor-pointer transition-colors"
                            >
                              <p className="text-sm line-clamp-2">{post.content}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {post.author_name}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {}
                {query && !loading && totalResults === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
                    <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or search terms</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};