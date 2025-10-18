import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API } from '../App';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import { Sparkles, Users, TrendingUp, FileText, Loader2, Target, Award } from 'lucide-react';
export const VolunteerMatchingDialog = ({ eventId, eventTitle, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const findMatches = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/ai/volunteer-matching`, {
        event_id: eventId
      });
      setMatches(response.data.matches || []);
      toast.success('AI matching complete!');
    } catch (error) {
      console.error('Error finding matches:', error);
      toast.error('Failed to find matches');
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => {
    if (open && eventId) {
      findMatches();
    }
  }, [open, eventId]);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Volunteer Matching for {eventTitle}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">AI is finding the best volunteers...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No matching volunteers found</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              AI has analyzed {matches.length} volunteers and ranked them by compatibility
            </p>
            {matches.map((volunteer, index) => (
              <Card key={volunteer.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={volunteer.avatar} alt={volunteer.name} />
                        <AvatarFallback>{volunteer.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                        #{index + 1}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{volunteer.name}</h4>
                        <Badge variant="secondary">
                          {volunteer.match_score}% Match
                        </Badge>
                      </div>
                      {volunteer.bio && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {volunteer.bio}
                        </p>
                      )}
                      {volunteer.match_reason && (
                        <div className="bg-primary/10 rounded-md p-2 mb-2">
                          <p className="text-xs text-primary font-medium flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            {volunteer.match_reason}
                          </p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {volunteer.skills && volunteer.skills.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {volunteer.skills.slice(0, 3).map((skill, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {volunteer.location && (
                        <p className="text-xs text-muted-foreground">📍 {volunteer.location}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
export const ImpactPredictionCard = ({ eventId, onPredictionReceived }) => {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const getPrediction = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/ai/impact-prediction`, {
        event_id: eventId
      });
      setPrediction(response.data.prediction);
      if (onPredictionReceived) {
        onPredictionReceived(response.data.prediction);
      }
      toast.success('Prediction generated!');
    } catch (error) {
      console.error('Error getting prediction:', error);
      toast.error('Failed to get prediction');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          AI Impact Prediction
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!prediction ? (
          <div className="text-center py-4">
            <Button onClick={getPrediction} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get AI Prediction
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Success Probability</span>
                <Badge variant={prediction.success_probability >= 70 ? "default" : "secondary"}>
                  {prediction.confidence} confidence
                </Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${prediction.success_probability}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full ${
                    prediction.success_probability >= 70
                      ? 'bg-green-500'
                      : prediction.success_probability >= 50
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {prediction.success_probability}%
              </p>
            </div>
            {}
            {prediction.key_strengths && prediction.key_strengths.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Award className="h-4 w-4 text-green-500" />
                  Key Strengths
                </h4>
                <ul className="space-y-1">
                  {prediction.key_strengths.map((strength, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {}
            {prediction.potential_risks && prediction.potential_risks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Target className="h-4 w-4 text-yellow-500" />
                  Potential Risks
                </h4>
                <ul className="space-y-1">
                  {prediction.potential_risks.map((risk, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-yellow-500">⚠</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {}
            {prediction.recommendations && prediction.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Recommendations
                </h4>
                <ul className="space-y-1">
                  {prediction.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">→</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button onClick={getPrediction} variant="outline" size="sm" className="w-full">
              Refresh Prediction
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
export const ImpactStoryGenerator = ({ sourceType, sourceId, onStoryGenerated }) => {
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState(null);
  const generateStory = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/ai/generate-impact-story`, {
        source_type: sourceType,
        source_id: sourceId
      });
      setStory(response.data);
      if (onStoryGenerated) {
        onStoryGenerated(response.data);
      }
      toast.success('Impact story generated!');
    } catch (error) {
      console.error('Error generating story:', error);
      toast.error('Failed to generate story');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          AI Impact Story Generator
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!story ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Let AI create a compelling impact story from your data
            </p>
            <Button onClick={generateStory} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Story
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold mb-3">{story.title}</h3>
              <div className="prose prose-sm dark:prose-invert">
                <p className="text-muted-foreground whitespace-pre-line">{story.content}</p>
              </div>
            </div>
            {}
            {story.key_stats && story.key_stats.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {story.key_stats.map((stat, i) => (
                  <div key={i} className="bg-primary/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}
            {}
            {story.call_to_action && (
              <div className="bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg p-4">
                <p className="font-semibold text-center">{story.call_to_action}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={generateStory} variant="outline" size="sm" className="flex-1">
                Regenerate
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(`${story.title}\n\n${story.content}`);
                  toast.success('Story copied to clipboard!');
                }}
              >
                Copy Story
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};