import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Navigation } from '../components/Navigation';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
const DonationSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking');
  const [amount, setAmount] = useState(0);
  const sessionId = searchParams.get('session_id');
  useEffect(() => {
    if (!sessionId) {
      navigate('/donations');
      return;
    }
    pollPaymentStatus();
  }, [sessionId]);
  const pollPaymentStatus = async (attempts = 0) => {
    const maxAttempts = 5;
    if (attempts >= maxAttempts) {
      setStatus('timeout');
      return;
    }
    try {
      const response = await axios.get(`${API}/donations/status/${sessionId}`);
      if (response.data.payment_status === 'paid') {
        setStatus('success');
        setAmount(response.data.amount_total / 100);
        return;
      }
      setTimeout(() => pollPaymentStatus(attempts + 1), 2000);
    } catch (error) {
      setTimeout(() => pollPaymentStatus(attempts + 1), 2000);
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-lg">
            <CardContent className="pt-12 pb-12 text-center">
              {status === 'checking' && (
                <>
                  <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-6" />
                  <h2 className="heading-font text-2xl font-bold mb-2">Processing Your Donation</h2>
                  <p className="text-muted-foreground">Please wait while we confirm your payment...</p>
                </>
              )}
              {status === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </div>
                  <h2 className="heading-font text-3xl font-bold mb-4">Thank You for Your Donation!</h2>
                  <p className="text-lg text-muted-foreground mb-6">
                    Your contribution of <span className="heading-font font-bold text-primary">${amount.toFixed(2)}</span> will make a real difference.
                  </p>
                  <p className="text-sm text-muted-foreground mb-8">
                    A confirmation email with your tax-deductible receipt has been sent to your email address.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button onClick={() => navigate('/feed')} size="lg">
                      Return to Feed
                    </Button>
                    <Button onClick={() => navigate('/donations')} variant="outline" size="lg">
                      Make Another Donation
                    </Button>
                  </div>
                </motion.div>
              )}
              {status === 'timeout' && (
                <>
                  <div className="h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-6">
                    <Loader2 className="h-10 w-10 text-yellow-600" />
                  </div>
                  <h2 className="heading-font text-2xl font-bold mb-2">Payment Processing</h2>
                  <p className="text-muted-foreground mb-8">
                    Your payment is still being processed. Please check your email for confirmation.
                  </p>
                  <Button onClick={() => navigate('/feed')} size="lg">
                    Return to Feed
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
export default DonationSuccess;
