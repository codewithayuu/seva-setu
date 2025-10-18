import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigation } from '../components/Navigation';
import axios from 'axios';
import { 
  TrendingUp, Users, DollarSign, Calendar, Heart, Award, 
  BarChart3, PieChart, Target, BookOpen, MessageSquare, ThumbsUp 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
const API_URL = process.env.REACT_APP_BACKEND_URL || '';
export default function Impact() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [stories, setStories] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [caseStudies, setCaseStudies] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (user) {
      fetchImpactData();
    }
  }, [user]);
  const fetchImpactData = async () => {
    try {
      setLoading(true);
      const ngoId = user?.id;
      if (!ngoId) {
        setLoading(false);
        return;
      }
      const dashboardRes = await axios.get(`${API_URL}/api/impact/dashboard/${ngoId}`, { withCredentials: true });
      setDashboard(dashboardRes.data);
      const storiesRes = await axios.get(`${API_URL}/api/impact/stories`, { withCredentials: true });
      setStories(storiesRes.data.stories);
      const testimonialsRes = await axios.get(`${API_URL}/api/impact/testimonials`, { withCredentials: true });
      setTestimonials(testimonialsRes.data.testimonials);
      const caseStudiesRes = await axios.get(`${API_URL}/api/impact/case-studies`, { withCredentials: true });
      setCaseStudies(caseStudiesRes.data.case_studies);
      const outcomesRes = await axios.get(`${API_URL}/api/impact/outcomes?ngo_id=${ngoId}`, { withCredentials: true });
      setOutcomes(outcomesRes.data.outcomes);
    } catch (error) {
      console.error('Error fetching impact data:', error);
      toast.error('Failed to load impact data');
    } finally {
      setLoading(false);
    }
  };
  const likeStory = async (storyId) => {
    try {
      await axios.post(`${API_URL}/api/impact/stories/${storyId}/like`, {}, { withCredentials: true });
      fetchImpactData(); 
    } catch (error) {
      console.error('Error liking story:', error);
      toast.error('Failed to like story');
    }
  };
  const StatCard = ({ title, value, icon: Icon, description, color = "blue" }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-${color}-600`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <p className="text-lg">Please log in to view impact metrics</p>
        </Card>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-pulse text-lg">Loading impact data...</div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Impact Dashboard</h1>
          <p className="text-gray-600">Track and showcase your social impact</p>
        </div>
        {}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Volunteer Hours"
            value={dashboard?.total_volunteer_hours?.toFixed(0) || 0}
            icon={Users}
            description="Total hours contributed"
            color="blue"
          />
          <StatCard
            title="Total Donations"
            value={`$${dashboard?.total_donations?.toFixed(0) || 0}`}
            icon={DollarSign}
            description="Funds raised"
            color="green"
          />
          <StatCard
            title="Events Organized"
            value={dashboard?.total_events || 0}
            icon={Calendar}
            description="Community events"
            color="purple"
          />
          <StatCard
            title="Success Stories"
            value={dashboard?.total_stories || 0}
            icon={Heart}
            description="Stories shared"
            color="red"
          />
        </div>
        {}
        {dashboard?.metrics_by_type && Object.keys(dashboard.metrics_by_type).length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Impact Metrics by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(dashboard.metrics_by_type).map(([type, data]) => (
                  <div key={type} className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                    <h4 className="font-semibold capitalize mb-2">{type.replace('_', ' ')}</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {data.total.toFixed(0)} {data.unit}
                    </p>
                    <p className="text-sm text-gray-600">{data.count} entries</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {}
        <Tabs defaultValue="stories" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="stories">Success Stories</TabsTrigger>
            <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
            <TabsTrigger value="case-studies">Case Studies</TabsTrigger>
            <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          </TabsList>
          {}
          <TabsContent value="stories" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Success Stories</h2>
              <Button onClick={() => window.location.href = '/impact/stories/new'}>
                Create Story
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stories.length > 0 ? stories.map((story) => (
                <Card key={story.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    {story.images && story.images.length > 0 && (
                      <img 
                        src={story.images[0]} 
                        alt={story.title}
                        className="w-full h-48 object-cover rounded-lg mb-4"
                      />
                    )}
                    <CardTitle className="line-clamp-2">{story.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      {story.category && <Badge variant="secondary">{story.category}</Badge>}
                      {story.featured && <Badge variant="default">Featured</Badge>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4">{story.content}</p>
                    {story.impact_numbers && Object.keys(story.impact_numbers).length > 0 && (
                      <div className="bg-blue-50 p-3 rounded-lg mb-4">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Impact Metrics:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(story.impact_numbers).map(([key, value]) => (
                            <span key={key} className="text-xs bg-white px-2 py-1 rounded">
                              {key}: <strong>{value}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => likeStory(story.id)}
                          className="flex items-center gap-1 hover:text-red-600"
                        >
                          <ThumbsUp className="h-4 w-4" />
                          {story.likes_count}
                        </button>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          {story.views_count} views
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <Card className="col-span-full p-8">
                  <p className="text-center text-gray-500">No success stories yet. Create your first story!</p>
                </Card>
              )}
            </div>
          </TabsContent>
          {}
          <TabsContent value="testimonials" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Testimonials</h2>
              <Button onClick={() => window.location.href = '/impact/testimonials/new'}>
                Add Testimonial
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {testimonials.length > 0 ? testimonials.map((testimonial) => (
                <Card key={testimonial.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {testimonial.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{testimonial.name}</h4>
                        <p className="text-sm text-gray-600">{testimonial.role}</p>
                        {testimonial.location && (
                          <p className="text-xs text-gray-500">{testimonial.location}</p>
                        )}
                        <div className="flex gap-1 mt-1">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <span key={i} className="text-yellow-500">★</span>
                          ))}
                        </div>
                      </div>
                      {testimonial.verified && (
                        <Badge variant="default" className="bg-green-600">Verified</Badge>
                      )}
                    </div>
                    <p className="text-gray-700 italic">"{testimonial.testimonial}"</p>
                  </CardContent>
                </Card>
              )) : (
                <Card className="col-span-full p-8">
                  <p className="text-center text-gray-500">No testimonials yet. Add your first testimonial!</p>
                </Card>
              )}
            </div>
          </TabsContent>
          {}
          <TabsContent value="case-studies" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Case Studies</h2>
              <Button onClick={() => window.location.href = '/impact/case-studies/new'}>
                Create Case Study
              </Button>
            </div>
            <div className="space-y-4">
              {caseStudies.length > 0 ? caseStudies.map((study) => (
                <Card key={study.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{study.title}</CardTitle>
                        <CardDescription>{study.summary}</CardDescription>
                      </div>
                      {study.featured && <Badge variant="default">Featured</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {study.beneficiaries_count && (
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{study.beneficiaries_count}</p>
                          <p className="text-xs text-gray-600">Beneficiaries</p>
                        </div>
                      )}
                      {study.volunteers_involved && (
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">{study.volunteers_involved}</p>
                          <p className="text-xs text-gray-600">Volunteers</p>
                        </div>
                      )}
                      {study.funds_utilized && (
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <p className="text-2xl font-bold text-purple-600">${study.funds_utilized}</p>
                          <p className="text-xs text-gray-600">Funds Used</p>
                        </div>
                      )}
                    </div>
                    {study.tags && study.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {study.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )) : (
                <Card className="p-8">
                  <p className="text-center text-gray-500">No case studies yet. Create your first case study!</p>
                </Card>
              )}
            </div>
          </TabsContent>
          {}
          <TabsContent value="outcomes" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Outcome Tracking</h2>
              <Button onClick={() => window.location.href = '/impact/outcomes/new'}>
                Track New Outcome
              </Button>
            </div>
            <div className="space-y-4">
              {outcomes.length > 0 ? outcomes.map((outcome) => (
                <Card key={outcome.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          {outcome.outcome_title}
                        </CardTitle>
                        {outcome.outcome_description && (
                          <CardDescription className="mt-2">{outcome.outcome_description}</CardDescription>
                        )}
                      </div>
                      <Badge 
                        variant={
                          outcome.status === 'achieved' ? 'default' :
                          outcome.status === 'at_risk' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {outcome.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">Progress: {outcome.progress_percentage}%</span>
                          <span className="font-semibold">
                            {outcome.current_value} / {outcome.target_value} {outcome.unit}
                          </span>
                        </div>
                        <Progress value={outcome.progress_percentage} className="h-3" />
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Baseline</p>
                          <p className="font-semibold">{outcome.baseline_value} {outcome.unit}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Current</p>
                          <p className="font-semibold">{outcome.current_value} {outcome.unit}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Target</p>
                          <p className="font-semibold">{outcome.target_value} {outcome.unit}</p>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Started: {new Date(outcome.start_date).toLocaleDateString()}</span>
                        {outcome.target_date && (
                          <span>Target: {new Date(outcome.target_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <Card className="p-8">
                  <p className="text-center text-gray-500">No outcomes tracked yet. Start tracking your first outcome!</p>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
