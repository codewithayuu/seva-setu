import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API } from '../App';
import { Navigation } from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { MapPin, Calendar, Users, Clock, Plus, Edit2, Trash2, CheckCircle2, Eye, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ImageUpload } from '../components/ImageUpload';
import { BackToTop } from '../components/animations/BackToTop';
import { PullToRefresh } from '../components/mobile/PullToRefresh';
import { GridItem } from '../components/animations/AnimatedComponents';
const Events = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [attendeesDialogOpen, setAttendeesDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [userNGOs, setUserNGOs] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshIntervalRef = useRef(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    location_details: '',
    category: '',
    theme: '',
    volunteers_needed: 10,
    ngo_id: '',
    images: []
  });
  useEffect(() => {
    fetchEvents();
    fetchUserNGOs();
    refreshIntervalRef.current = setInterval(() => {
      fetchEventsQuietly();
    }, 30000);
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);
  const fetchEventsQuietly = async () => {
    try {
      const response = await axios.get(`${API}/events`);
      setEvents(response.data.events || []);
    } catch (error) {
    }
  };
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchEvents();
    setIsRefreshing(false);
    toast.success('Events refreshed!');
  };
  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/events`);
      setEvents(response.data.events || []);
    } catch (error) {
    }
  };
  const fetchUserNGOs = async () => {
    try {
      const response = await axios.get(`${API}/ngos`);
      const myNGOs = (response.data.ngos || []).filter(ngo => ngo.owner_id === user?.id);
      setUserNGOs(myNGOs);
    } catch (error) {
    }
  };
  const handleRSVP = async (eventId) => {
    try {
      const response = await axios.post(`${API}/events/${eventId}/rsvp`);
      if (response.data.registered) {
        setRegistrations(new Set([...registrations, eventId]));
        toast.success('Successfully registered for event!');
      } else {
        const newRegs = new Set(registrations);
        newRegs.delete(eventId);
        setRegistrations(newRegs);
        toast.success('Registration cancelled');
      }
      fetchEvents();
    } catch (error) {
      toast.error('Failed to register');
    }
  };
  const handleCheckIn = async (eventId) => {
    try {
      await axios.post(`${API}/events/${eventId}/checkin`);
      toast.success('Checked in successfully!');
      fetchEvents();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to check in');
    }
  };
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/events`, eventForm);
      setCreateDialogOpen(false);
      resetForm();
      fetchEvents();
      toast.success('Event created successfully!');
    } catch (error) {
      toast.error('Failed to create event');
    }
  };
  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`${API}/events/${selectedEvent.id}`, eventForm);
      setEditDialogOpen(false);
      setSelectedEvent(null);
      resetForm();
      fetchEvents();
      toast.success('Event updated successfully!');
    } catch (error) {
      toast.error('Failed to update event');
    }
  };
  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await axios.delete(`${API}/events/${eventId}`);
      fetchEvents();
      toast.success('Event deleted!');
    } catch (error) {
      toast.error('Failed to delete event');
    }
  };
  const fetchAttendees = async (eventId) => {
    try {
      const response = await axios.get(`${API}/events/${eventId}/attendees`);
      setAttendees(response.data);
      setAttendeesDialogOpen(true);
    } catch (error) {
      toast.error('Failed to fetch attendees');
    }
  };
  const resetForm = () => {
    setEventForm({
      title: '',
      description: '',
      date: '',
      location: '',
      location_details: '',
      category: '',
      theme: '',
      volunteers_needed: 10,
      ngo_id: '',
      images: []
    });
  };
  const openEditDialog = (event) => {
    setSelectedEvent(event);
    setEventForm({
      title: event.title,
      description: event.description,
      date: new Date(event.date).toISOString().slice(0, 16),
      location: event.location,
      location_details: typeof event.location_details === 'string' ? event.location_details : '',
      category: event.category,
      theme: event.theme || '',
      volunteers_needed: event.volunteers_needed,
      ngo_id: event.ngo_id,
      images: Array.isArray(event.images) ? event.images : []
    });
    setEditDialogOpen(true);
  };
  const canManageEvent = (event) => {
    return user && event.owner_id === user.id;
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-purple-950/30 dark:to-slate-900">
      <Navigation />
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="heading-font text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 bg-clip-text text-transparent">Volunteer Events</h1>
            <p className="text-lg text-muted-foreground">Discover opportunities to make a difference in your community</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {userNGOs.length > 0 && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            )}
          </div>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow group" data-testid="event-card">
                {event.images && event.images.length > 0 && (
                  <div className="relative h-48 overflow-hidden rounded-t-xl">
                    <img
                      src={event.images[0]}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Badge>{event.category}</Badge>
                      {event.theme && <Badge variant="secondary">{event.theme}</Badge>}
                    </div>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="heading-font text-xl mb-2">{event.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{event.ngo_name}</p>
                    </div>
                    {canManageEvent(event) && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(event)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteEvent(event.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm line-clamp-3">{event.description}</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(event.date), 'PPP')}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {format(new Date(event.date), 'p')}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                    {event.location}
                  </div>
                  {event.location_details && typeof event.location_details === 'string' && event.location_details.trim() && (
                    <p className="text-xs text-muted-foreground pl-6">{event.location_details}</p>
                  )}
                    <motion.div 
                      className="flex items-center gap-2 text-sm"
                      key={`volunteers-${event.id}-${event.volunteers_registered}`}
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.3 }}
                    >
                      <Users className="h-4 w-4 text-primary" />
                      <span className="heading-font font-semibold text-primary">
                        {event.volunteers_registered}/{event.volunteers_needed} volunteers
                      </span>
                      {event.volunteers_registered > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Live
                        </Badge>
                      )}
                    </motion.div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleRSVP(event.id)}
                      variant={registrations.has(event.id) ? "outline" : "default"}
                      data-testid="event-rsvp-button"
                    >
                      {registrations.has(event.id) ? 'Cancel RSVP' : 'Register Now'}
                    </Button>
                    {registrations.has(event.id) && (
                      <Button
                        variant="outline"
                        onClick={() => handleCheckIn(event.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {canManageEvent(event) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedEvent(event);
                        fetchAttendees(event.id);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Attendees
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {events.length === 0 && (
            <div className="col-span-full">
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="heading-font text-lg font-semibold mb-2">No Events Yet</h3>
                  <p className="text-muted-foreground">Check back soon for volunteering opportunities</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      {}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <Label>NGO</Label>
              <select
                className="w-full border rounded-md p-2"
                value={eventForm.ngo_id}
                onChange={(e) => setEventForm({...eventForm, ngo_id: e.target.value})}
                required
              >
                <option value="">Select NGO</option>
                {userNGOs.map(ngo => (
                  <option key={ngo.id} value={ngo.id}>{ngo.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Event Title</Label>
              <Input
                value={eventForm.title}
                onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={eventForm.description}
                onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Input
                  value={eventForm.category}
                  onChange={(e) => setEventForm({...eventForm, category: e.target.value})}
                  placeholder="Education, Health, etc."
                  required
                />
              </div>
              <div>
                <Label>Theme</Label>
                <Input
                  value={eventForm.theme}
                  onChange={(e) => setEventForm({...eventForm, theme: e.target.value})}
                  placeholder="Optional theme"
                />
              </div>
            </div>
            <div>
              <Label>Date and Time</Label>
              <Input
                type="datetime-local"
                value={eventForm.date}
                onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={eventForm.location}
                onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                placeholder="City, State"
                required
              />
            </div>
            <div>
              <Label>Location Details</Label>
              <Textarea
                value={eventForm.location_details}
                onChange={(e) => setEventForm({...eventForm, location_details: e.target.value})}
                placeholder="Detailed address, landmarks, parking info, etc."
              />
            </div>
            <div>
              <Label>Volunteers Needed</Label>
              <Input
                type="number"
                value={eventForm.volunteers_needed}
                onChange={(e) => setEventForm({...eventForm, volunteers_needed: parseInt(e.target.value)})}
                min="1"
                required
              />
            </div>
            <div>
              <Label>Event Images</Label>
              <ImageUpload
                onImagesChange={(imgs) => setEventForm({...eventForm, images: imgs})}
                multiple={true}
                maxImages={5}
                existingImages={eventForm.images}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Event</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateEvent} className="space-y-4">
            <div>
              <Label>Event Title</Label>
              <Input
                value={eventForm.title}
                onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={eventForm.description}
                onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Input
                  value={eventForm.category}
                  onChange={(e) => setEventForm({...eventForm, category: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>Theme</Label>
                <Input
                  value={eventForm.theme}
                  onChange={(e) => setEventForm({...eventForm, theme: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Date and Time</Label>
              <Input
                type="datetime-local"
                value={eventForm.date}
                onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={eventForm.location}
                onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Location Details</Label>
              <Textarea
                value={eventForm.location_details}
                onChange={(e) => setEventForm({...eventForm, location_details: e.target.value})}
              />
            </div>
            <div>
              <Label>Volunteers Needed</Label>
              <Input
                type="number"
                value={eventForm.volunteers_needed}
                onChange={(e) => setEventForm({...eventForm, volunteers_needed: parseInt(e.target.value)})}
                min="1"
                required
              />
            </div>
            <div>
              <Label>Event Images</Label>
              <ImageUpload
                onImagesChange={(imgs) => setEventForm({...eventForm, images: imgs})}
                multiple={true}
                maxImages={5}
                existingImages={eventForm.images}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Event</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {}
      <Dialog open={attendeesDialogOpen} onOpenChange={setAttendeesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Attendees</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {attendees.length > 0 ? (
              attendees.map((attendee) => (
                <div key={attendee.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{attendee.user_name}</p>
                    <p className="text-xs text-muted-foreground">{attendee.user_email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={attendee.checked_in ? 'default' : 'secondary'}>
                      {attendee.status}
                    </Badge>
                    {attendee.checked_in && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No attendees yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default Events;