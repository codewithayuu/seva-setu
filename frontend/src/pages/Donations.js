import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API } from '../App';
import { Navigation } from '../components/Navigation';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Heart, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
const Donations = () => {
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  useEffect(() => {
    fetchPackages();
  }, []);
  const fetchPackages = async () => {
    try {
      const response = await axios.get(`${API}/donations/packages`);
      const packagesData = response.data.packages || [];
      setPackages(packagesData);
      if (packagesData.length > 0) {
        setSelectedPackage(packagesData[0].id);
      }
    } catch (error) {
      setPackages([]); 
    }
  };
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPackages();
    setIsRefreshing(false);
  };
  const handleDonate = async () => {
    if (!selectedPackage) {
      toast.error('Please select a donation package');
      return;
    }
    const selectedPkgData = packages.find(p => p.id === selectedPackage);
    if (!selectedPkgData) {
      toast.error('Invalid package selected');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API}/donations/checkout`, {
        ngo_id: '00000000-0000-0000-0000-000104763899', 
        amount: selectedPkgData.amount,
        currency: 'USD'
      });
      window.location.href = response.data.url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process donation');
      setLoading(false);
    }
  };
  const selectedPkg = Array.isArray(packages) ? packages.find(p => p.id === selectedPackage) : null;
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-purple-950/30 dark:to-slate-900">
      <Navigation />
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl pt-24 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1"></div>
            <motion.div 
              className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Heart className="h-8 w-8 text-primary" />
            </motion.div>
            <div className="flex-1 flex justify-end">
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
            </div>
          </div>
          <h1 className="heading-font text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 bg-clip-text text-transparent">Make a Difference Today</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your donation directly supports NGOs working to create positive change in communities worldwide.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="heading-font text-2xl">Choose Your Donation</CardTitle>
              <CardDescription>Select a donation package that works for you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={selectedPackage} onValueChange={setSelectedPackage}>
                <div className="space-y-4">
                  {packages.map((pkg) => (
                    <Label
                      key={pkg.id}
                      htmlFor={pkg.id}
                      className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                      data-testid="donation-package-option"
                    >
                      <RadioGroupItem value={pkg.id} id={pkg.id} />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="heading-font text-lg font-semibold">{pkg.name}</span>
                          <Badge variant="secondary">${pkg.amount}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{pkg.description}</p>
                      </div>
                    </Label>
                  ))}
                </div>
              </RadioGroup>
              {selectedPkg && (
                <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Selected Package:</span>
                    <span className="heading-font text-lg font-bold">{selectedPkg.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Amount:</span>
                    <span className="heading-font text-2xl font-bold text-primary">${selectedPkg.amount.toFixed(2)}</span>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                        <span className="text-sm">Secure payment processing via Stripe</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                        <span className="text-sm">100% of your donation goes to NGOs</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                        <span className="text-sm">Tax-deductible receipt provided</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <Button
                size="lg"
                className="w-full h-12"
                onClick={handleDonate}
                disabled={loading || !selectedPackage}
                data-testid="donation-submit-button"
              >
                {loading ? 'Processing...' : (
                  <>
                    Proceed to Payment
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                By clicking "Proceed to Payment", you will be redirected to our secure payment partner Stripe to complete your donation.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
export default Donations;
