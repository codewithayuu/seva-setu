import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ThemeToggle } from '../components/ThemeToggle';
import { toast } from 'sonner';
import { Heart, Calendar, TrendingUp, Sparkles, Shield, Globe, Award, Zap } from 'lucide-react';
const LandingPage = () => {
  const { register, login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    userType: 'volunteer'
  });
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
      } else {
        await register(formData.name, formData.email, formData.password, formData.userType);
        toast.success('Account created successfully!');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900">
      {}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-purple-500 via-purple-400 to-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 dark:opacity-20"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 dark:opacity-20"
          animate={{
            x: [0, -50, 0],
            y: [0, 100, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-25 dark:opacity-15"
          animate={{
            x: [-50, 50, -50],
            y: [-50, 50, -50],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      {}
      <div className="absolute top-6 right-6 z-50">
        <div className="glass-card rounded-full p-2">
          <ThemeToggle />
        </div>
      </div>
      {}
      <div className="relative z-10 mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-12 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[90vh]">
          {}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-2 glass-card rounded-full px-4 py-2 text-sm font-medium"
            >
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold">
                Join 50,000+ Change Makers Today
              </span>
            </motion.div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="block bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                Transform Lives
              </span>
              <span className="block mt-2 text-slate-900 dark:text-white">
                Through Impact
              </span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-prose leading-relaxed">
              Seva-Setu connects passionate volunteers with meaningful causes. 
              Join NGOs making real impact and track your contribution in real-time.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button 
                size="lg" 
                onClick={() => setIsLogin(false)} 
                className="h-14 px-8 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:from-purple-700 hover:via-purple-600 hover:to-blue-700 text-white rounded-full shadow-lg shadow-purple-500/40 hover:shadow-xl hover:shadow-purple-600/50 transition-all duration-300"
                data-testid="hero-get-started-button"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Get Started Now
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => setIsLogin(true)} 
                className="h-14 px-8 glass-card hover:bg-white/60 dark:hover:bg-white/15 rounded-full border-2 transition-all duration-300"
                data-testid="hero-signin-button"
              >
                Sign In
              </Button>
            </div>
            {}
            <div className="grid grid-cols-3 gap-4 pt-8">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="glass-card rounded-2xl p-4 text-center"
              >
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  10K+
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Active NGOs</div>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="glass-card rounded-2xl p-4 text-center"
              >
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  50K+
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Volunteers</div>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="glass-card rounded-2xl p-4 text-center"
              >
                <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  $2M+
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Donated</div>
              </motion.div>
            </div>
          </motion.div>
          {}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="glass-card-strong rounded-3xl p-8 shadow-2xl" data-testid="auth-card">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  {isLogin ? 'Welcome Back' : 'Join Us Today'}
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  {isLogin ? 'Continue your impact journey' : 'Start making a difference'}
                </p>
              </div>
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                    isLogin 
                      ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 text-white shadow-lg shadow-purple-500/30' 
                      : 'glass-card hover:bg-white/60 dark:hover:bg-white/15'
                  }`}
                  data-testid="login-tab"
                >
                  Login
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                    !isLogin 
                      ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 text-white shadow-lg shadow-purple-500/30' 
                      : 'glass-card hover:bg-white/60 dark:hover:bg-white/15'
                  }`}
                  data-testid="register-tab"
                >
                  Register
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleChange}
                      required={!isLogin}
                      className="glass-input h-12 rounded-xl border-white/20 focus:border-purple-500"
                      data-testid="name-input"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="glass-input h-12 rounded-xl border-white/20 focus:border-purple-500"
                    data-testid="email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="glass-input h-12 rounded-xl border-white/20 focus:border-purple-500"
                    data-testid="password-input"
                  />
                </div>
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="userType" className="text-slate-700 dark:text-slate-300">I am a</Label>
                    <Select value={formData.userType} onValueChange={(v) => setFormData({ ...formData, userType: v })}>
                      <SelectTrigger className="glass-input h-12 rounded-xl border-white/20" data-testid="user-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-card-strong rounded-xl">
                        <SelectItem value="volunteer">Volunteer</SelectItem>
                        <SelectItem value="ngo">NGO Representative</SelectItem>
                        <SelectItem value="donor">Donor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:from-purple-700 hover:via-purple-600 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-600/40 font-semibold transition-all duration-300" 
                  disabled={loading} 
                  data-testid="auth-submit-button"
                >
                  {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
      {}
      <div className="relative z-10 py-20 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Why Choose Seva-Setu?
                </span>
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                A comprehensive platform designed to amplify social impact
              </p>
            </motion.div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Heart, title: "Connect & Impact", desc: "Find NGOs aligned with your values and make direct impact", gradient: "from-red-500 to-pink-500" },
              { icon: Calendar, title: "Events & Opportunities", desc: "Discover volunteering events and contribute your skills", gradient: "from-blue-500 to-cyan-500" },
              { icon: TrendingUp, title: "Track Your Impact", desc: "Monitor volunteer hours, donations, and real-world impact", gradient: "from-green-500 to-emerald-500" },
              { icon: Award, title: "Earn Badges", desc: "Get recognized for your contributions with achievement badges", gradient: "from-yellow-500 to-orange-500" },
              { icon: Globe, title: "Global Reach", desc: "Connect with causes worldwide on our interactive impact map", gradient: "from-purple-500 to-indigo-500" },
              { icon: Shield, title: "Secure & Transparent", desc: "Safe donations with full transparency and impact tracking", gradient: "from-teal-500 to-cyan-500" }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <div className="glass-card-strong rounded-2xl p-6 h-full hover:shadow-2xl transition-all duration-300">
                  <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      {}
      <div className="relative z-10 py-20">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="glass-card-strong rounded-3xl p-12 text-center shadow-2xl"
          >
            <Zap className="h-16 w-16 mx-auto mb-6 text-yellow-500" />
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Ready to Make an Impact?
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              Join thousands of volunteers and NGOs creating positive change every day
            </p>
            <Button 
              size="lg" 
              onClick={() => {
                setIsLogin(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="h-14 px-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-full shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-600/50 transition-all duration-300 text-lg font-semibold"
              data-testid="cta-start-journey-button"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Start Your Journey
            </Button>
          </motion.div>
        </div>
      </div>
      {}
      <footer className="relative z-10 py-8 glass-card-strong border-t border-white/20">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl text-center">
          <p className="text-slate-600 dark:text-slate-400">
            © 2025 Seva-Setu. Bridging hearts to causes.
          </p>
        </div>
      </footer>
    </div>
  );
};
export default LandingPage;
