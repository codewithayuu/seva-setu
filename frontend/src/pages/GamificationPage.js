import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Leaderboards,
  BadgesDisplay,
  ChallengesCard,
  StreaksWidget,
  CommunityScore
} from '../components/GamificationComponents';
import {
  LiveImpactCounter,
  InteractiveImpactMap,
  ImpactHeatmap,
  DonationTicker,
  ImpactTimeline
} from '../components/RealtimeComponents';
import {
  AnalyticsDashboard
} from '../components/AnalyticsComponents';
import { Trophy, Zap, BarChart3 } from 'lucide-react';
function GamificationPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('gamification');
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 py-8">
      {}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10 animate-pulse" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10 animate-pulse" />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Impact Hub</h1>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            Track your impact, compete with others, and visualize your contributions
          </p>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="glass-card-strong grid w-full grid-cols-3 mb-8 p-2 h-auto rounded-2xl">
            <TabsTrigger value="gamification" className="flex items-center gap-2 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white">
              <Trophy className="h-4 w-4" />
              Gamification
            </TabsTrigger>
            <TabsTrigger value="realtime" className="flex items-center gap-2 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-600 data-[state=active]:text-white">
              <Zap className="h-4 w-4" />
              Real-time Impact
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>
          {}
          <TabsContent value="gamification" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Leaderboards category="volunteer" metricType="hours" />
              </div>
              <div className="space-y-6">
                {user && <StreaksWidget userId={user.id} />}
                <CommunityScore entityType="user" />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChallengesCard />
              {user && <BadgesDisplay userId={user.id} />}
            </div>
          </TabsContent>
          {}
          <TabsContent value="realtime" className="space-y-6">
            <LiveImpactCounter />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InteractiveImpactMap />
              <ImpactHeatmap />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DonationTicker />
              <ImpactTimeline limit={15} />
            </div>
          </TabsContent>
          {}
          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard 
              ngoId={user?.ngo_id}
              eventId={null}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
export default GamificationPage;