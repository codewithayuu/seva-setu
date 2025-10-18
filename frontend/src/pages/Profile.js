import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Navigation } from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Calendar, Heart, TrendingUp, Edit2, Camera, UserPlus, UserMinus, MapPin, Link as LinkIcon, Phone, Mail, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { ImageUpload } from '../components/ImageUpload';
import { toast } from 'sonner';
import { format } from 'date-fns';
const Profile = () => {
  const { userId } = useParams();
  const { user: currentUser, setUser: setCurrentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  useEffect(() => {
    fetchUserProfile();
    fetchUserStats();
    fetchActivities();
    checkFollowStatus();
    fetchFollowers();
    fetchFollowing();
  }, [userId]);
  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/users/${userId}`);
      setUser(response.data);
      setEditForm(response.data);
    } catch (error) {
    }
  };
  const fetchUserStats = async () => {
    try {
      const response = await axios.get(`${API}/users/${userId}/stats`);
      setStats(response.data);
    } catch (error) {
    }
  };
  const fetchActivities = async () => {
    try {
      const response = await axios.get(`${API}/users/${userId}/activities`);
      setActivities(response.data);
    } catch (error) {
    }
  };
  const checkFollowStatus = async () => {
    if (!currentUser || currentUser.id === userId) return;
    try {
      const response = await axios.get(`${API}/users/${userId}/followers`);
      const isUserFollowing = response.data.some(f => f.follower_id === currentUser.id);
      setIsFollowing(isUserFollowing);
    } catch (error) {
    }
  };
  const fetchFollowers = async () => {
    try {
      const response = await axios.get(`${API}/users/${userId}/followers`);
      setFollowers(response.data);
    } catch (error) {
    }
  };
  const fetchFollowing = async () => {
    try {
      const response = await axios.get(`${API}/users/${userId}/following`);
      setFollowing(response.data);
    } catch (error) {
    }
  };
  const handleFollow = async () => {
    try {
      await axios.post(`${API}/users/${userId}/follow`);
      setIsFollowing(!isFollowing);
      fetchUserProfile();
      fetchFollowers();
      toast.success(isFollowing ? 'Unfollowed' : 'Following');
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.patch(`${API}/users/${userId}`, {
        bio: editForm.bio,
        phone: editForm.phone,
        website: editForm.website,
        location: editForm.location,
        avatar: editForm.avatar,
        cover_photo: editForm.cover_photo,
        social_links: editForm.social_links || {},
        skills: editForm.skills || [],
        interests: editForm.interests || [],
        is_private: editForm.is_private || false,
        email_notifications: editForm.email_notifications !== false
      });
      setUser(response.data);
      setCurrentUser(response.data);
      setEditDialogOpen(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await axios.post(`${API}/users/change-password`, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      setPasswordDialogOpen(false);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    }
  };
  if (!user || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-purple-950/30 dark:to-slate-900">
        <Navigation />
        <div className="flex items-center justify-center py-16">
          <div className="animate-pulse text-lg heading-font bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 bg-clip-text text-transparent">Loading profile...</div>
        </div>
      </div>
    );
  }
  const isOwnProfile = currentUser?.id === userId;
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-purple-950/30 dark:to-slate-900">
      <Navigation />
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl py-8">
        {}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mb-6">
            <div
              className="h-32 sm:h-48 rounded-t-xl relative"
              style={{
                background: user.cover_photo ? 
                  `url(${user.cover_photo}) center/cover` : 
                  'linear-gradient(135deg, hsl(28 85% 72%), hsl(165 60% 65%))'
              }}
            >
              {isOwnProfile && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-4 right-4"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Edit Cover
                </Button>
              )}
            </div>
            <CardContent className="relative pt-16 sm:pt-20">
              <div className="absolute -top-16 left-6">
                <Avatar className="h-32 w-32 ring-4 ring-background">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="text-4xl">{user.name?.[0]}</AvatarFallback>
                </Avatar>
              </div>
              <div className="ml-40 sm:ml-44">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="heading-font text-2xl sm:text-3xl font-bold">{user.name}</h1>
                      <Badge>{user.user_type}</Badge>
                    </div>
                    <p className="text-muted-foreground mb-2 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </p>
                    {user.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4" />
                        {user.location}
                      </p>
                    )}
                    {user.bio && <p className="text-sm mt-2">{user.bio}</p>}
                    <div className="flex items-center gap-4 mt-3">
                      <div className="text-sm">
                        <span className="font-semibold">{user.followers_count || 0}</span>
                        <span className="text-muted-foreground"> followers</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-semibold">{user.following_count || 0}</span>
                        <span className="text-muted-foreground"> following</span>
                      </div>
                    </div>
                    {}
                    {user.social_links && Object.keys(user.social_links).length > 0 && (
                      <div className="flex items-center gap-3 mt-3">
                        {user.phone && (
                          <a href={`tel:${user.phone}`} className="text-muted-foreground hover:text-primary">
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                        {user.website && (
                          <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                        {user.social_links.linkedin && (
                          <a href={user.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                            <LinkIcon className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {isOwnProfile ? (
                      <>
                        <Button onClick={() => setEditDialogOpen(true)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                        <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>
                          Change Password
                        </Button>
                      </>
                    ) : (
                      <Button onClick={handleFollow}>
                        {isFollowing ? (
                          <>
                            <UserMinus className="h-4 w-4 mr-2" />
                            Unfollow
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Follow
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        {}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid md:grid-cols-3 gap-6 mb-6"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="heading-font text-2xl">{stats.volunteer_hours}</CardTitle>
                  <p className="text-sm text-muted-foreground">Volunteer Hours</p>
                </div>
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[hsl(var(--brand-accent))]/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-[hsl(var(--brand-accent))]" />
                </div>
                <div>
                  <CardTitle className="heading-font text-2xl">{stats.events_registered}</CardTitle>
                  <p className="text-sm text-muted-foreground">Events Attended</p>
                </div>
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[hsl(var(--brand-support))]/10 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-[hsl(var(--brand-support))]" />
                </div>
                <div>
                  <CardTitle className="heading-font text-2xl">${stats.total_donated}</CardTitle>
                  <p className="text-sm text-muted-foreground">Total Donated</p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </motion.div>
        {}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="about">
                <TabsList className="grid w-full grid-cols-4" data-testid="profile-tabs">
                  <TabsTrigger value="about">About</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="followers">Followers</TabsTrigger>
                  <TabsTrigger value="following">Following</TabsTrigger>
                </TabsList>
                <TabsContent value="about" className="space-y-4 mt-6">
                  <div>
                    <h3 className="heading-font font-semibold mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {user.skills && user.skills.length > 0 ? (
                        user.skills.map((skill, i) => <Badge key={i} variant="secondary">{skill}</Badge>)
                      ) : (
                        <p className="text-sm text-muted-foreground">No skills listed</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="heading-font font-semibold mb-2">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {user.interests && user.interests.length > 0 ? (
                        user.interests.map((interest, i) => <Badge key={i} variant="outline">{interest}</Badge>)
                      ) : (
                        <p className="text-sm text-muted-foreground">No interests listed</p>
                      )}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="activity" className="mt-6">
                  <div className="space-y-4">
                    {activities.length > 0 ? (
                      activities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.activity_type}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(activity.created_at), 'PPp')}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No activities yet</p>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="followers" className="mt-6">
                  <div className="space-y-3">
                    {followers.length > 0 ? (
                      followers.map((follower) => (
                        <Link
                          key={follower.follower_id}
                          to={`/profile/${follower.follower_id}`}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Avatar>
                            <AvatarImage src={follower.follower_avatar} />
                            <AvatarFallback>{follower.follower_name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{follower.follower_name}</p>
                            <p className="text-xs text-muted-foreground">{follower.follower_email}</p>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No followers yet</p>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="following" className="mt-6">
                  <div className="space-y-3">
                    {following.length > 0 ? (
                      following.map((item) => (
                        <Link
                          key={item.id}
                          to={item.type === 'user' ? `/profile/${item.id}` : `/ngo/${item.id}`}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Avatar>
                            <AvatarImage src={item.avatar} />
                            <AvatarFallback>{item.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.name}</p>
                            <Badge variant="outline" className="text-xs">{item.type}</Badge>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">Not following anyone yet</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      {}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <Label>Profile Picture</Label>
              <ImageUpload
                onImagesChange={(imgs) => setEditForm({...editForm, avatar: imgs[0] || ''})}
                multiple={false}
                existingImages={editForm.avatar ? [editForm.avatar] : []}
              />
            </div>
            <div>
              <Label>Cover Photo</Label>
              <ImageUpload
                onImagesChange={(imgs) => setEditForm({...editForm, cover_photo: imgs[0] || ''})}
                multiple={false}
                existingImages={editForm.cover_photo ? [editForm.cover_photo] : []}
              />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea
                value={editForm.bio || ''}
                onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                placeholder="Tell us about yourself"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <Label>Website</Label>
                <Input
                  value={editForm.website || ''}
                  onChange={(e) => setEditForm({...editForm, website: e.target.value})}
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={editForm.location || ''}
                onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                placeholder="City, Country"
              />
            </div>
            <div>
              <Label>Skills (comma-separated)</Label>
              <Input
                value={editForm.skills?.join(', ') || ''}
                onChange={(e) => setEditForm({...editForm, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                placeholder="Teaching, Community Organizing, Fundraising"
              />
            </div>
            <div>
              <Label>Interests (comma-separated)</Label>
              <Input
                value={editForm.interests?.join(', ') || ''}
                onChange={(e) => setEditForm({...editForm, interests: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                placeholder="Education, Environment, Healthcare"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Private Profile</Label>
                <p className="text-xs text-muted-foreground">Only followers can see your posts</p>
              </div>
              <Switch
                checked={editForm.is_private || false}
                onCheckedChange={(checked) => setEditForm({...editForm, is_private: checked})}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive updates via email</p>
              </div>
              <Switch
                checked={editForm.email_notifications !== false}
                onCheckedChange={(checked) => setEditForm({...editForm, email_notifications: checked})}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label>Current Password</Label>
              <Input
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Change Password</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default Profile;
