import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Trophy, Award, Flame, Target, TrendingUp, Users, Clock, DollarSign, Star, Medal, Crown } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001/api';
export function Leaderboards({ category = 'volunteer', metricType = 'hours' }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [selectedMetric, setSelectedMetric] = useState(metricType);
  useEffect(() => {
    fetchLeaderboard();
  }, [selectedCategory, selectedMetric]);
  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/gamification/leaderboards`, {
        params: {
          category: selectedCategory,
          metric_type: selectedMetric,
          limit: 20
        },
        withCredentials: true
      });
      setLeaderboard(response.data.leaderboard || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
    return <span className="text-lg font-bold text-gray-500">#{rank}</span>;
  };
  const getMetricLabel = (metric) => {
    const labels = {
      hours: 'Hours',
      donations: 'Donations ($)',
      events: 'Events',
      impact: 'Impact Points'
    };
    return labels[metric] || metric;
  };
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Leaderboards
        </CardTitle>
        <CardDescription>Top contributors making an impact</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="volunteer">
              <Users className="h-4 w-4 mr-2" />
              Volunteers
            </TabsTrigger>
            <TabsTrigger value="donor">
              <DollarSign className="h-4 w-4 mr-2" />
              Donors
            </TabsTrigger>
            <TabsTrigger value="ngo">
              <TrendingUp className="h-4 w-4 mr-2" />
              NGOs
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="mt-4 flex gap-2">
          {['hours', 'donations', 'events', 'impact'].map((metric) => (
            <Button
              key={metric}
              variant={selectedMetric === metric ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedMetric(metric)}
            >
              {getMetricLabel(metric)}
            </Button>
          ))}
        </div>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="mt-6 space-y-3">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex-shrink-0 w-12 flex justify-center">
                  {getRankIcon(entry.rank_position)}
                </div>
                <div className="flex-grow">
                  <p className="font-semibold">
                    {entry.user?.name || entry.ngo?.name || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {entry.user?.location || entry.ngo?.category || ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {parseFloat(entry.total_value).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">{getMetricLabel(selectedMetric)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export function BadgesDisplay({ userId }) {
  const [badges, setBadges] = useState([]);
  const [userBadges, setUserBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchBadges();
    if (userId) {
      fetchUserBadges();
    }
  }, [userId]);
  const fetchBadges = async () => {
    try {
      const response = await axios.get(`${API}/gamification/badges`);
      setBadges(response.data.badges || []);
    } catch (error) {
    }
  };
  const fetchUserBadges = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/gamification/user-badges/${userId}`);
      setUserBadges(response.data.user_badges || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  const hasEarned = (badgeId) => {
    return userBadges.some(ub => ub.badge_id === badgeId);
  };
  const getRarityColor = (rarity) => {
    const colors = {
      common: 'bg-gray-500',
      rare: 'bg-blue-500',
      epic: 'bg-purple-500',
      legendary: 'bg-yellow-500'
    };
    return colors[rarity] || 'bg-gray-500';
  };
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-6 w-6 text-blue-600" />
          Achievement Badges
        </CardTitle>
        <CardDescription>
          {userId ? `Earned ${userBadges.length} of ${badges.length} badges` : 'Available badges'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {badges.map((badge) => {
              const earned = hasEarned(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    earned
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-700 opacity-50 grayscale'
                  }`}
                >
                  <div className="text-4xl mb-2">{badge.badge_icon}</div>
                  <p className="font-semibold text-sm">{badge.badge_name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {badge.badge_description}
                  </p>
                  <Badge className={`mt-2 ${getRarityColor(badge.rarity)} text-white`}>
                    {badge.rarity}
                  </Badge>
                  <p className="text-xs mt-1 text-gray-500">{badge.points} pts</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export function ChallengesCard() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const { toast } = useToast();
  useEffect(() => {
    fetchChallenges();
  }, []);
  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/gamification/challenges`, {
        params: { status: 'active', limit: 20 },
        withCredentials: true
      });
      setChallenges(response.data.challenges || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  const joinChallenge = async (challengeId) => {
    try {
      await axios.post(
        `${API}/gamification/challenges/${challengeId}/join`,
        {},
        { withCredentials: true }
      );
      toast({
        title: 'Challenge Joined!',
        description: 'You have successfully joined this challenge.'
      });
      fetchChallenges();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to join challenge',
        variant: 'destructive'
      });
    }
  };
  const getProgressPercentage = (current, target) => {
    return Math.min(100, (parseFloat(current) / parseFloat(target)) * 100);
  };
  const getDaysRemaining = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-6 w-6 text-green-600" />
          Active Challenges
        </CardTitle>
        <CardDescription>Join community challenges and make an impact together</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : challenges.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No active challenges</p>
        ) : (
          <div className="space-y-4">
            {challenges.map((challenge) => {
              const progress = getProgressPercentage(challenge.current_value, challenge.target_value);
              const daysLeft = getDaysRemaining(challenge.end_date);
              return (
                <div
                  key={challenge.id}
                  className="p-4 border rounded-lg hover:border-blue-500 transition-colors cursor-pointer"
                  onClick={() => setSelectedChallenge(challenge)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-grow">
                      <h3 className="font-semibold text-lg">{challenge.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {challenge.description}
                      </p>
                    </div>
                    {challenge.image_url && (
                      <img
                        src={challenge.image_url}
                        alt={challenge.title}
                        className="w-16 h-16 rounded object-cover ml-4"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Progress</span>
                      <span className="font-semibold">
                        {parseFloat(challenge.current_value).toLocaleString()} / {parseFloat(challenge.target_value).toLocaleString()} {challenge.unit}
                      </span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <div className="flex items-center justify-between text-sm mt-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{challenge.participant_count} participants</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{daysLeft} days left</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      joinChallenge(challenge.id);
                    }}
                  >
                    Join Challenge
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <Dialog open={!!selectedChallenge} onOpenChange={() => setSelectedChallenge(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedChallenge?.title}</DialogTitle>
            <DialogDescription>{selectedChallenge?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">Goal</p>
              <p className="text-2xl font-bold text-blue-600">
                {parseFloat(selectedChallenge?.target_value || 0).toLocaleString()} {selectedChallenge?.unit}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">Current Progress</p>
              <p className="text-lg">
                {parseFloat(selectedChallenge?.current_value || 0).toLocaleString()} {selectedChallenge?.unit}
              </p>
            </div>
            {selectedChallenge?.reward_points > 0 && (
              <div>
                <p className="text-sm font-semibold">Reward</p>
                <p className="text-lg">{selectedChallenge.reward_points} points</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
export function StreaksWidget({ userId }) {
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  useEffect(() => {
    if (userId) {
      fetchStreak();
    }
  }, [userId]);
  const fetchStreak = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/gamification/streaks/${userId}`);
      setStreak(response.data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  const checkIn = async () => {
    try {
      const response = await axios.post(`${API}/gamification/streaks/checkin`, {}, { withCredentials: true });
      if (response.data.success) {
        setStreak(response.data.streak);
        toast({
          title: 'Check-in Successful! 🔥',
          description: `Current streak: ${response.data.streak.current_streak} days`
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to check in',
        variant: 'destructive'
      });
    }
  };
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 text-center">Loading...</CardContent>
      </Card>
    );
  }
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-orange-500" />
          Activity Streak
        </CardTitle>
        <CardDescription>Keep your impact streak alive!</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-6xl font-bold text-orange-500 mb-2">
            {streak?.current_streak || 0}
          </div>
          <p className="text-gray-600 dark:text-gray-400">Days Current Streak</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-2xl font-bold">{streak?.longest_streak || 0}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Longest Streak</p>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-2xl font-bold">{streak?.total_checkins || 0}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Total Check-ins</p>
          </div>
        </div>
        <Button className="w-full" onClick={checkIn}>
          <Flame className="h-4 w-4 mr-2" />
          Check In Today
        </Button>
      </CardContent>
    </Card>
  );
}
export function CommunityScore({ entityType = 'user' }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchScores();
  }, [entityType]);
  const fetchScores = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/gamification/community-score`, {
        params: { entity_type: entityType, limit: 10 }
      });
      setScores(response.data.community_scores || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-6 w-6 text-yellow-500" />
          Community Impact Score
        </CardTitle>
        <CardDescription>Top {entityType}s by overall impact</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="space-y-3">
            {scores.map((score, index) => (
              <div key={score.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-lg font-bold text-gray-500 w-8">#{index + 1}</span>
                <div className="flex-grow">
                  <p className="font-semibold">{score.user?.name || score.ngo?.name}</p>
                  <div className="flex gap-2 text-xs text-gray-600 dark:text-gray-400 mt-1">
                    <span>Level {score.level}</span>
                    <span>•</span>
                    <span>{score.total_score} pts</span>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary">{score.total_score}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
