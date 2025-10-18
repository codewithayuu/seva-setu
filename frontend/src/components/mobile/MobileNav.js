import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { 
  Menu, 
  X, 
  Home, 
  Building2, 
  Calendar, 
  MessageSquare, 
  TrendingUp, 
  Heart,
  Users,
  LogOut,
  Bell
} from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { NotificationBadge } from '../Notifications';
export const MobileNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const menuItems = [
    { path: '/feed', icon: Home, label: 'Feed' },
    { path: '/ngos', icon: Building2, label: 'NGOs' },
    { path: '/events', icon: Calendar, label: 'Events' },
    { path: '/messages', icon: MessageSquare, label: 'Messages' },
    { path: '/impact', icon: TrendingUp, label: 'Impact' },
    { path: '/impact-hub', icon: TrendingUp, label: 'Impact Hub' },
    { path: '/donations', icon: Heart, label: 'Donate' },
  ];
  return (
    <>
      {}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/feed" className="heading-font text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Seva-Setu
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="relative"
            >
              <Bell className="h-5 w-5" />
              <NotificationBadge />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </nav>
      {}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-[57px] right-0 bottom-0 w-80 bg-background border-l border-white/10 z-50 overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                {}
                <div className="flex items-center gap-3 p-4 glass-card rounded-xl">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback>{user?.name?.[0] || user?.full_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{user?.name || user?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                {}
                <div className="space-y-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                          isActive
                            ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-600'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
                {}
                {user?.user_type === 'ngo' && (
                  <Link to="/create-ngo" onClick={() => setIsOpen(false)}>
                    <Button className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600">
                      <Users className="h-5 w-5 mr-2" />
                      Create NGO
                    </Button>
                  </Link>
                )}
                {}
                <Button
                  variant="outline"
                  className="w-full rounded-xl border-white/20"
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                  }}
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Logout
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-white/10">
        <div className="flex items-center justify-around px-2 py-2">
          {menuItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'text-purple-600'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};