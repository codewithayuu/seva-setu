import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { TrendingUp, MapPin, DollarSign, Users, Activity, Calendar } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001/api';
export function LiveImpactCounter() {
  const [counters, setCounters] = useState({});
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);
  useEffect(() => {
    fetchCounters();
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
  const fetchCounters = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/realtime/counters`);
      setCounters(response.data.counters || {});
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  const connectWebSocket = () => {
    const wsUrl = process.env.REACT_APP_BACKEND_URL?.replace('http', 'ws').replace('/api', '') || 'ws://localhost:8001';//localhost:8001';
    const ws = new WebSocket(`${wsUrl}/ws/guest-${Date.now()}`);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'counter_update') {
        setCounters(prev => ({
          ...prev,
          [message.counter_name]: {
            value: message.value,
            type: prev[message.counter_name]?.type || 'impact',
            last_updated: new Date().toISOString()
          }
        }));
      }
    };
    wsRef.current = ws;
  };
  const animateNumber = (value) => {
    return parseInt(value || 0).toLocaleString();
  };
  const counterConfigs = [
    { key: 'total_volunteers', label: 'Total Volunteers', icon: Users, color: 'text-blue-600' },
    { key: 'total_volunteer_hours', label: 'Volunteer Hours', icon: Activity, color: 'text-green-600' },
    { key: 'total_donations', label: 'Donations Raised', icon: DollarSign, color: 'text-yellow-600', prefix: '$' },
    { key: 'total_people_helped', label: 'People Helped', icon: TrendingUp, color: 'text-purple-600' },
    { key: 'total_events', label: 'Events Completed', icon: Calendar, color: 'text-red-600' },
    { key: 'trees_planted', label: 'Trees Planted', icon: TrendingUp, color: 'text-emerald-600' }
  ];
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 text-center">Loading impact data...</CardContent>
      </Card>
    );
  }
  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2">Live Impact Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-400">Real-time updates of our collective impact</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {counterConfigs.map(({ key, label, icon: Icon, color, prefix = '' }) => {
          const counter = counters[key];
          return (
            <Card key={key} className="overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-grow">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
                    <p className={`text-4xl font-bold ${color} mb-2 transition-all duration-500`}>
                      {prefix}{animateNumber(counter?.value)}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      <Activity className="h-3 w-3 mr-1" />
                      Live
                    </Badge>
                  </div>
                  <Icon className={`h-12 w-12 ${color} opacity-20`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
export function InteractiveImpactMap() {
  const [mapData, setMapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  useEffect(() => {
    fetchMapData();
  }, []);
  const fetchMapData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/realtime/impact-map`);
      setMapData(response.data.impact_events || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  const getEventIcon = (eventType) => {
    const icons = {
      volunteer_signup: '👋',
      donation: '💰',
      event_completed: '✅',
      milestone: '🎯'
    };
    return icons[eventType] || '📍';
  };
  const defaultCenter = [20, 0]; 
  const defaultZoom = 2;
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 text-center">Loading map...</CardContent>
      </Card>
    );
  }
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-6 w-6 text-blue-600" />
          Global Impact Map
        </CardTitle>
        <CardDescription>See where we're making an impact around the world</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height: '500px', width: '100%' }}>
          <MapContainer
            center={defaultCenter}
            zoom={defaultZoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapData.map((event) => (
              event.location_lat && event.location_lng && (
                <Marker
                  key={event.id}
                  position={[parseFloat(event.location_lat), parseFloat(event.location_lng)]}
                  eventHandlers={{
                    click: () => setSelectedEvent(event)
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <div className="text-2xl mb-2">{getEventIcon(event.event_type)}</div>
                      <h3 className="font-semibold text-sm">{event.title}</h3>
                      <p className="text-xs text-gray-600 mt-1">{event.description}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {event.location_name || 'Unknown location'}
                      </p>
                      {event.impact_value && (
                        <p className="text-xs font-semibold text-blue-600 mt-1">
                          Impact: {event.impact_value} {event.impact_unit}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>
        {selectedEvent && (
          <div className="mt-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
            <h4 className="font-semibold">{selectedEvent.title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {selectedEvent.description}
            </p>
            <div className="flex gap-2 mt-2">
              <Badge>{selectedEvent.event_type}</Badge>
              <Badge variant="secondary">{selectedEvent.location_name}</Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export function ImpactHeatmap() {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchHeatmapData();
  }, []);
  const fetchHeatmapData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/realtime/heatmap`);
      setHeatmapData(response.data.heatmap_data || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  const getHeatColor = (intensity) => {
    if (intensity >= 80) return '#dc2626'; // red-600
    if (intensity >= 60) return '#f97316'; // orange-500
    if (intensity >= 40) return '#eab308'; // yellow-500
    if (intensity >= 20) return '#84cc16'; // lime-500
    return '#22c55e'; // green-500
  };
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 text-center">Loading heatmap...</CardContent>
      </Card>
    );
  }
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-red-600" />
          Impact Heatmap
        </CardTitle>
        <CardDescription>Activity intensity by location</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height: '500px', width: '100%' }}>
          <MapContainer
            center={[20, 0]}
            zoom={2}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {heatmapData.map((point) => (
              point.location_lat && point.location_lng && (
                <CircleMarker
                  key={point.id}
                  center={[parseFloat(point.location_lat), parseFloat(point.location_lng)]}
                  radius={Math.min(20, point.intensity / 5)}
                  fillColor={getHeatColor(point.intensity)}
                  fillOpacity={0.6}
                  stroke={false}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold text-sm">{point.location_name || 'Location'}</h3>
                      <p className="text-xs mt-1">Activity: {point.activity_count} events</p>
                      <p className="text-xs">Volunteer Hours: {parseFloat(point.volunteer_hours || 0).toFixed(1)}</p>
                      <p className="text-xs">Donations: ${parseFloat(point.donation_amount || 0).toFixed(2)}</p>
                      <p className="text-xs">People Helped: {point.people_helped || 0}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            ))}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
export function DonationTicker() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const tickerRef = useRef(null);
  const wsRef = useRef(null);
  useEffect(() => {
    fetchDonations();
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
  const fetchDonations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/realtime/donation-ticker`, {
        params: { limit: 20 }
      });
      setDonations(response.data.donations || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  const connectWebSocket = () => {
    const wsUrl = process.env.REACT_APP_BACKEND_URL?.replace('http', 'ws').replace('/api', '') || 'ws://localhost:8001';
    const ws = new WebSocket(`${wsUrl}/ws/guest-${Date.now()}`);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'new_donation') {
        setDonations(prev => [message.donation, ...prev.slice(0, 19)]);
      }
    };
    wsRef.current = ws;
  };
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 text-center">Loading donations...</CardContent>
      </Card>
    );
  }
  return (
    <Card className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          Live Donation Ticker
        </CardTitle>
        <CardDescription className="text-white/80">Recent contributions making a difference</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden" style={{ height: '200px' }}>
          <div
            ref={tickerRef}
            className="animate-scroll space-y-2"
            style={{
              animation: 'scroll 30s linear infinite'
            }}
          >
            {[...donations, ...donations].map((donation, index) => (
              <div
                key={`${donation.id}-${index}`}
                className="flex items-center gap-3 p-3 bg-white/10 rounded-lg backdrop-blur"
              >
                <DollarSign className="h-5 w-5" />
                <div className="flex-grow">
                  <p className="font-semibold">{donation.donor_name}</p>
                  <p className="text-sm text-white/80">donated to {donation.ngo_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">
                    {donation.currency === 'USD' ? '$' : ''}
                    {parseFloat(donation.amount).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
      `}</style>
    </Card>
  );
}
export function ImpactTimeline({ limit = 20 }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);
  useEffect(() => {
    fetchTimeline();
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/realtime/timeline`, {
        params: { limit }
      });
      setTimeline(response.data.timeline_events || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  const connectWebSocket = () => {
    const wsUrl = process.env.REACT_APP_BACKEND_URL?.replace('http', 'ws').replace('/api', '') || 'ws://localhost:8001';//localhost:8001';
    const ws = new WebSocket(`${wsUrl}/ws/guest-${Date.now()}`);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'new_impact_event') {
        setTimeline(prev => [message.event, ...prev.slice(0, limit - 1)]);
      }
    };
    wsRef.current = ws;
  };
  const getEventIcon = (eventType) => {
    const icons = {
      volunteer_signup: { icon: '👋', color: 'bg-blue-500' },
      donation: { icon: '💰', color: 'bg-green-500' },
      event_completed: { icon: '✅', color: 'bg-purple-500' },
      milestone: { icon: '🎯', color: 'bg-yellow-500' }
    };
    return icons[eventType] || { icon: '📍', color: 'bg-gray-500' };
  };
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 text-center">Loading timeline...</CardContent>
      </Card>
    );
  }
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-600" />
          Impact Timeline
        </CardTitle>
        <CardDescription>Real-time feed of community impact</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timeline.map((event) => {
            const { icon, color } = getEventIcon(event.event_type);
            return (
              <div key={event.id} className="flex gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full ${color} flex items-center justify-center text-2xl`}>
                  {icon}
                </div>
                <div className="flex-grow">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{event.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {event.description}
                      </p>
                      {event.user && (
                        <p className="text-xs text-gray-500 mt-1">
                          by {event.user.name}
                        </p>
                      )}
                      {event.impact_value && (
                        <Badge variant="secondary" className="mt-2">
                          Impact: {event.impact_value} {event.impact_unit}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{formatTimeAgo(event.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
