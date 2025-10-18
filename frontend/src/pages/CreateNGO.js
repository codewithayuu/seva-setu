import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Navigation } from '../components/Navigation';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
const CreateNGO = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'education',
    founded_year: new Date().getFullYear(),
    website: '',
    location: ''
  });
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/ngos`, formData);
      toast.success('NGO created successfully!');
      navigate('/feed');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create NGO');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="heading-font text-3xl">Create Your NGO</CardTitle>
              <CardDescription>
                Share your organization's mission and connect with volunteers and donors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Save the Children Foundation"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    data-testid="ngo-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Tell us about your organization's mission and impact..."
                    value={formData.description}
                    onChange={handleChange}
                    required
                    className="min-h-[120px]"
                    data-testid="ngo-description-input"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger data-testid="ngo-category-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="health">Health</SelectItem>
                        <SelectItem value="environment">Environment</SelectItem>
                        <SelectItem value="poverty">Poverty Alleviation</SelectItem>
                        <SelectItem value="human-rights">Human Rights</SelectItem>
                        <SelectItem value="disaster">Disaster Relief</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="founded_year">Founded Year</Label>
                    <Input
                      id="founded_year"
                      name="founded_year"
                      type="number"
                      min="1900"
                      max={new Date().getFullYear()}
                      value={formData.founded_year}
                      onChange={handleChange}
                      data-testid="ngo-year-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.website}
                    onChange={handleChange}
                    data-testid="ngo-website-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    name="location"
                    placeholder="New York, USA"
                    value={formData.location}
                    onChange={handleChange}
                    required
                    data-testid="ngo-location-input"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <Button type="submit" disabled={loading} className="flex-1" data-testid="create-ngo-submit">
                    {loading ? 'Creating...' : 'Create NGO'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate('/feed')}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
export default CreateNGO;
