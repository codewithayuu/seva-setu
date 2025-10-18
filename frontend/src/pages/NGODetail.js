import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Edit2, Users, UserPlus, UserMinus, Trash2, Camera, Image as ImageIcon, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { ImageUpload } from '../components/ImageUpload';
const NGODetail = () => {
  const { ngoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ngo, setNgo] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');
  useEffect(() => {
    fetchNGO();
    checkFollowStatus();
  }, [ngoId]);
  const fetchNGO = async () => {
    try {
      const response = await axios.get(`${API}/ngos/${ngoId}`);
      setNgo(response.data);
      setEditForm(response.data);
    } catch (error) {
      toast.error('Failed to load NGO');
    }
  };
  const checkFollowStatus = async () => {
    if (!user) return;
    try {
      const response = await axios.get(`${API}/ngos/${ngoId}`);
      const ngoData = response.data;
      if (ngoData.followers && Array.isArray(ngoData.followers)) {
        setIsFollowing(ngoData.followers.includes(user.id));
      }
    } catch (error) {
    }
  };
  const handleFollow = async () => {
    try {
      await axios.post(`${API}/ngos/${ngoId}/follow`);
      setIsFollowing(!isFollowing);
      fetchNGO();
      toast.success(isFollowing ? 'Unfollowed NGO' : 'Following NGO');
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };
  const handleUpdateNGO = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`${API}/ngos/${ngoId}`, {
        description: editForm.description,
        website: editForm.website,
        location: editForm.location,
        gallery: editForm.gallery || []
      });
      setEditDialogOpen(false);
      fetchNGO();
      toast.success('NGO updated successfully');
    } catch (error) {
      toast.error('Failed to update NGO');
    }
  };
  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/ngos/${ngoId}/team`, {
        user_email: newMemberEmail,
        role: newMemberRole
      });
      setAddMemberDialogOpen(false);
      setNewMemberEmail('');
      setNewMemberRole('member');
      fetchNGO();
      toast.success('Team member added');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add team member');
    }
  };
  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this team member?')) return;
    try {
      await axios.delete(`${API}/ngos/${ngoId}/team/${userId}`);
      fetchNGO();
      toast.success('Team member removed');
    } catch (error) {
      toast.error('Failed to remove team member');
    }
  };
  if (!ngo) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-16">
          <div className="animate-pulse text-lg heading-font">Loading...</div>
        </div>
      </div>
    );
  }
  const isOwner = user && ngo.owner_id === user.id;
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl py-8">
        {}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-6">
                <Avatar className="h-32 w-32 rounded-lg">
                  <AvatarImage src={ngo.logo} />
                  <AvatarFallback className="text-4xl rounded-lg">{ngo.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h1 className="heading-font text-3xl font-bold">{ngo.name}</h1>
                        <Badge>{ngo.category}</Badge>
                      </div>
                      <p className="text-muted-foreground">{ngo.location}</p>
                      {ngo.website && (
                        <a
                          href={ngo.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {ngo.website}
                        </a>
                      )}
                      <p className="text-sm text-muted-foreground mt-2">
                        Founded in {ngo.founded_year}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {isOwner ? (
                        <Button onClick={() => setEditDialogOpen(true)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
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
                  <p className="text-sm">{ngo.description}</p>
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
          className="mb-6"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
                {isOwner && (
                  <Button size="sm" onClick={() => setAddMemberDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ngo.team_members && ngo.team_members.length > 0 ? (
                  ngo.team_members.map((member) => (
                    <div key={member.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.user_avatar} />
                          <AvatarFallback>{member.user_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{member.user_name}</p>
                          <Badge variant="outline" className="text-xs">{member.role}</Badge>
                        </div>
                      </div>
                      {isOwner && member.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.user_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No team members yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        {}
        {ngo.gallery && ngo.gallery.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Gallery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {ngo.gallery.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Gallery ${idx + 1}`}
                      className="rounded-lg w-full h-48 object-cover"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
      {}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit NGO</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateNGO} className="space-y-4">
            <div>
              <Label>Description</Label>
              <Textarea
                value={editForm.description || ''}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Website</Label>
                <Input
                  value={editForm.website || ''}
                  onChange={(e) => setEditForm({...editForm, website: e.target.value})}
                  placeholder="https://example.org"
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={editForm.location || ''}
                  onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                  placeholder="City, State"
                />
              </div>
            </div>
            <div>
              <Label>Gallery</Label>
              <ImageUpload
                onImagesChange={(imgs) => setEditForm({...editForm, gallery: imgs})}
                multiple={true}
                maxImages={10}
                existingImages={editForm.gallery || []}
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
      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <Label>User Email</Label>
              <Input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>
            <div>
              <Label>Role</Label>
              <select
                className="w-full border rounded-md p-2"
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddMemberDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Member</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default NGODetail;
