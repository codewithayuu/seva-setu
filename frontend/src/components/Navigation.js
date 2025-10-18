import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { ThemeToggle } from './ThemeToggle';
import { GlobalSearch } from './GlobalSearch';
import Notifications, { NotificationBadge } from './Notifications';
import { MobileNav } from './mobile/MobileNav';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Heart, Users, Calendar, Home, LogOut, MessageSquare, TrendingUp, Bell, Building2 } from 'lucide-react';
export const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };
  return (
    <>
      {}
      <MobileNav />
      {}
      <nav className="hidden lg:block fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[95%] max-w-7xl">
        <div className="glass-card-strong rounded-full px-6 py-3 shadow-2xl border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/feed" className="heading-font text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent whitespace-nowrap" data-testid="logo-link">
                Seva-Setu
              </Link>
              <div className="flex items-center gap-3">
                <Link to="/feed" className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full hover:bg-white/10 hover:text-primary transition-all duration-200 whitespace-nowrap" data-testid="nav-feed">
                  <Home className="h-3.5 w-3.5" />
                  Feed
                </Link>
                <Link to="/ngos" className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full hover:bg-white/10 hover:text-primary transition-all duration-200 whitespace-nowrap" data-testid="nav-ngos">
                  <Building2 className="h-3.5 w-3.5" />
                  NGOs
                </Link>
                <Link to="/events" className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full hover:bg-white/10 hover:text-primary transition-all duration-200 whitespace-nowrap" data-testid="nav-events">
                  <Calendar className="h-3.5 w-3.5" />
                  Events
                </Link>
                <Link to="/messages" className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full hover:bg-white/10 hover:text-primary transition-all duration-200 whitespace-nowrap" data-testid="nav-messages">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Messages
                </Link>
                <Link to="/impact" className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full hover:bg-white/10 hover:text-primary transition-all duration-200 whitespace-nowrap" data-testid="nav-impact">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Impact
                </Link>
                <Link to="/impact-hub" className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-200 whitespace-nowrap" data-testid="nav-impact-hub">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Impact Hub
                </Link>
                <Link to="/donations" className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full hover:bg-white/10 hover:text-primary transition-all duration-200 whitespace-nowrap" data-testid="nav-donations">
                  <Heart className="h-3.5 w-3.5" />
                  Donate
                </Link>
              </div>
            </div>
            {}
            <div className="flex-1 max-w-md mx-4">
              <GlobalSearch />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {}
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative rounded-full h-9 w-9 p-0 hover:bg-white/10"
                onClick={() => setShowNotifications(true)}
              >
                <Bell className="h-4 w-4" />
                <NotificationBadge />
              </Button>
              {user?.user_type === 'ngo' && (
                <Link to="/create-ngo">
                  <Button variant="outline" size="sm" className="rounded-full border-white/20 hover:bg-white/10" data-testid="create-ngo-button">
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    Create NGO
                  </Button>
                </Link>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 hover:bg-white/10" data-testid="user-menu-button">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={`/profile/${user?.id}`} className="cursor-pointer" data-testid="profile-menu-item">
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive" data-testid="logout-menu-item">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
    {}
    <Notifications open={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
};