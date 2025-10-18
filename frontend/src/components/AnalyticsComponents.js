import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { Calculator, TrendingUp, TrendingDown, Target, Leaf, BarChart3, Zap } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001/api';
export function ROICalculator({ ngoId, eventId }) {
  const [calculationType, setCalculationType] = useState('event');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const calculateROI = async () => {
    if (!investmentAmount || parseFloat(investmentAmount) <= 0) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid investment amount',
        variant: 'destructive'
      });
      return;
    }
    try {
      setLoading(true);
      const response = await axios.post(
        `${API}/analytics/roi-calculator`,
        {
          calculation_type: calculationType,
          ngo_id: ngoId,
          event_id: eventId,
          investment_amount: parseFloat(investmentAmount)
        },
        { withCredentials: true }
      );
      if (response.data.success) {
        setResult(response.data.roi);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to calculate ROI',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-6 w-6 text-blue-600" />
          Impact ROI Calculator
        </CardTitle>
        <CardDescription>Calculate the return on investment for your social impact</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Calculation Type</Label>
          <Select value={calculationType} onValueChange={setCalculationType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="event">Single Event</SelectItem>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="ngo_overall">NGO Overall</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Investment Amount ($)</Label>
          <Input
            type="number"
            placeholder="Enter amount"
            value={investmentAmount}
            onChange={(e) => setInvestmentAmount(e.target.value)}
          />
        </div>
        <Button className="w-full" onClick={calculateROI} disabled={loading}>
          {loading ? 'Calculating...' : 'Calculate ROI'}
        </Button>
        {result && (
          <div className="mt-6 space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Return on Investment</p>
              <p className={`text-5xl font-bold ${result.roi_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {result.roi_percentage >= 0 ? '+' : ''}{result.roi_percentage}%
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-white dark:bg-slate-700 rounded">
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Impact Value</p>
                <p className="text-2xl font-bold text-blue-600">${result.total_impact_value.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-slate-700 rounded">
                <p className="text-xs text-gray-600 dark:text-gray-400">Investment</p>
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">${result.investment.toLocaleString()}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Direct Impact:</span>
                <span className="font-semibold">${result.direct_impact.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Indirect Impact:</span>
                <span className="font-semibold">${result.indirect_impact.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>People Impacted:</span>
                <span className="font-semibold">{result.people_impacted.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Cost Per Person:</span>
                <span className="font-semibold">${result.cost_per_person.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export function PredictiveAnalytics({ ngoId }) {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (ngoId) {
      fetchPredictions();
    }
  }, [ngoId]);
  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/analytics/predictions`, {
        params: { entity_id: ngoId }
      });
      setPredictions(response.data.predictions || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  const generatePrediction = async (predictionType) => {
    try {
      await axios.post(
        `${API}/analytics/predictions/generate`,
        {
          prediction_type: predictionType,
          entity_id: ngoId,
          entity_type: 'ngo'
        },
        { withCredentials: true }
      );
      fetchPredictions();
    } catch (error) {
    }
  };
  const getPredictionIcon = (type) => {
    const icons = {
      volunteer_need: '👥',
      donation_trend: '💰',
      event_success: '🎯'
    };
    return icons[type] || '📊';
  };
  const getConfidenceColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-purple-600" />
          Predictive Analytics
        </CardTitle>
        <CardDescription>AI-powered forecasts for better planning</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <Button onClick={() => generatePrediction('volunteer_need')} variant="outline" size="sm">
            Predict Volunteer Needs
          </Button>
          <Button onClick={() => generatePrediction('donation_trend')} variant="outline" size="sm" className="ml-2">
            Predict Donation Trends
          </Button>
        </div>
        {loading ? (
          <div className="text-center py-8">Loading predictions...</div>
        ) : predictions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No predictions available. Generate one above!</p>
        ) : (
          <div className="space-y-4">
            {predictions.map((prediction) => (
              <div key={prediction.id} className="p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{getPredictionIcon(prediction.prediction_type)}</div>
                  <div className="flex-grow">
                    <h4 className="font-semibold capitalize">
                      {prediction.prediction_type.replace('_', ' ')}
                    </h4>
                    <p className="text-2xl font-bold text-blue-600 mt-2">
                      {parseFloat(prediction.predicted_value).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      for {prediction.prediction_period.replace('_', ' ')}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">Confidence:</span>
                      <span className={`text-xs font-semibold ${getConfidenceColor(prediction.confidence_score)}`}>
                        {prediction.confidence_score}%
                      </span>
                      <Progress value={prediction.confidence_score} className="h-2 flex-grow max-w-[100px]" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export function ComparativeAnalytics({ ngoId }) {
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (ngoId) {
      fetchComparisons();
    }
  }, [ngoId]);
  const fetchComparisons = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/analytics/comparative`, {
        params: { ngo_id: ngoId }
      });
      setComparisons(response.data.comparisons || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  const formatMetricName = (name) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  const chartData = comparisons.map(comp => ({
    name: formatMetricName(comp.metric_name),
    'Your Value': comp.your_value,
    'Industry Average': comp.average
  }));
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-indigo-600" />
          Comparative Analytics
        </CardTitle>
        <CardDescription>See how you compare to similar organizations</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading comparisons...</div>
        ) : comparisons.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No comparison data available yet</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Your Value" fill="#3b82f6" />
                <Bar dataKey="Industry Average" fill="#94a3b8" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-6 space-y-3">
              {comparisons.map((comp, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex-grow">
                    <p className="font-semibold text-sm">{formatMetricName(comp.metric_name)}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Percentile: {comp.percentile}%
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {comp.performance === 'above_average' ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <Badge variant={comp.performance === 'above_average' ? 'default' : 'destructive'}>
                      {comp.performance === 'above_average' ? 'Above' : 'Below'} Average
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
export function ImpactMultiplier({ eventId }) {
  const [multipliers, setMultipliers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchMultipliers();
  }, [eventId]);
  const fetchMultipliers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/analytics/impact-multiplier`, {
        params: { source_event_id: eventId }
      });
      setMultipliers(response.data.multipliers || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-yellow-600" />
          Impact Multiplier
        </CardTitle>
        <CardDescription>How your actions create ripple effects</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading multipliers...</div>
        ) : multipliers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Start creating impact to see multiplier effects!</p>
            <div className="max-w-md mx-auto">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-slate-900 text-gray-500">Multiplier Example</span>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>• 1 volunteer trains 3 community members</p>
                <p>• 1 donation enables 5 more services</p>
                <p>• 1 event inspires 10 future volunteers</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {multipliers.map((multiplier) => (
              <div key={multiplier.id} className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                <div className="flex items-center gap-3 mb-3">
                  <Zap className="h-8 w-8 text-yellow-500" />
                  <div>
                    <h4 className="font-semibold capitalize">{multiplier.multiplier_type.replace('_', ' ')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{multiplier.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="text-center p-2 bg-white dark:bg-slate-800 rounded">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Initial</p>
                    <p className="text-lg font-bold">{parseFloat(multiplier.initial_impact).toLocaleString()}</p>
                  </div>
                  <div className="text-center p-2 bg-white dark:bg-slate-800 rounded flex items-center justify-center">
                    <p className="text-2xl font-bold text-yellow-600">×{multiplier.multiplier_factor}</p>
                  </div>
                  <div className="text-center p-2 bg-white dark:bg-slate-800 rounded">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Multiplied</p>
                    <p className="text-lg font-bold text-blue-600">{parseFloat(multiplier.multiplied_impact).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export function SustainabilityMetrics({ ngoId }) {
  const [metrics, setMetrics] = useState([]);
  const [aggregated, setAggregated] = useState({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (ngoId) {
      fetchMetrics();
    }
  }, [ngoId]);
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/analytics/sustainability`, {
        params: { ngo_id: ngoId }
      });
      setMetrics(response.data.metrics || []);
      setAggregated(response.data.aggregated || {});
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  const getMetricIcon = (type) => {
    const icons = {
      carbon_offset: '🌍',
      waste_reduced: '♻️',
      water_saved: '💧',
      trees_planted: '🌳',
      energy_saved: '⚡'
    };
    return icons[type] || '🌱';
  };
  const chartData = Object.keys(aggregated).map(key => ({
    name: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    value: aggregated[key].total
  }));
  const COLORS = ['#22c55e', '#3b82f6', '#eab308', '#f97316', '#a855f7'];
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-green-600" />
          Sustainability Metrics
        </CardTitle>
        <CardDescription>Environmental impact tracking</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading metrics...</div>
        ) : Object.keys(aggregated).length === 0 ? (
          <p className="text-center text-gray-500 py-8">No sustainability data available yet</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
              {Object.keys(aggregated).map((key) => {
                const metric = aggregated[key];
                return (
                  <div key={key} className="p-4 border rounded-lg text-center">
                    <div className="text-4xl mb-2">{getMetricIcon(key)}</div>
                    <p className="text-2xl font-bold text-green-600">
                      {parseFloat(metric.total).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {metric.unit}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 capitalize">
                      {key.replace(/_/g, ' ')}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
export function AnalyticsDashboard({ ngoId, eventId }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ROICalculator ngoId={ngoId} eventId={eventId} />
        <PredictiveAnalytics ngoId={ngoId} />
      </div>
      <ComparativeAnalytics ngoId={ngoId} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ImpactMultiplier eventId={eventId} />
        <SustainabilityMetrics ngoId={ngoId} />
      </div>
    </div>
  );
}
