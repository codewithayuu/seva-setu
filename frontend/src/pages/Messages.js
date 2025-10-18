import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { MessageSquare, Send, Search, Image, File, Smile, Check, CheckCheck, Circle, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { ScrollArea } from '../components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
const API_URL = process.env.REACT_APP_BACKEND_URL || '';
export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatEmail, setNewChatEmail] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  useEffect(() => {
    if (user) {
      fetchConversations();
      updatePresence('online');
    }
    return () => {
      if (user) {
        updatePresence('offline');
      }
    };
  }, [user]);
  useEffect(() => {
    if (selectedConv) {
      fetchMessages(selectedConv.id);
      const interval = setInterval(() => {
        fetchMessages(selectedConv.id);
        fetchTypingUsers(selectedConv.id);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedConv]);
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  useEffect(() => {
    const checkConnection = setInterval(() => {
      setIsConnected(navigator.onLine);
    }, 5000);
    return () => clearInterval(checkConnection);
  }, []);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  const updatePresence = async (status) => {
    try {
      await axios.post(`${API_URL}/api/presence`, { status }, { withCredentials: true });
    } catch (error) {
    }
  };
  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/conversations`, { withCredentials: true });
      setConversations(response.data.conversations);
    } catch (error) {
      toast.error('Failed to load conversations');
    }
  };
  const fetchMessages = async (conversationId) => {
    try {
      const response = await axios.get(`${API_URL}/api/conversations/${conversationId}/messages`, { withCredentials: true });
      setMessages(response.data.messages);
    } catch (error) {
    }
  };
  const fetchTypingUsers = async (conversationId) => {
    try {
      const response = await axios.get(`${API_URL}/api/conversations/${conversationId}/typing`, { withCredentials: true });
      setTypingUsers(response.data.typing_users);
    } catch (error) {
    }
  };
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv) return;
    try {
      const response = await axios.post(
        `${API_URL}/api/messages`,
        {
          conversation_id: selectedConv.id,
          content: newMessage,
          message_type: 'text'
        },
        { withCredentials: true }
      );
      setMessages([...messages, response.data.message]);
      setNewMessage('');
      updateTypingStatus(false);
      scrollToBottom();
    } catch (error) {
      toast.error('Failed to send message');
    }
  };
  const updateTypingStatus = async (typing) => {
    if (!selectedConv) return;
    try {
      await axios.post(
        `${API_URL}/api/conversations/${selectedConv.id}/typing`,
        { conversation_id: selectedConv.id, is_typing: typing },
        { withCredentials: true }
      );
    } catch (error) {
    }
  };
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      updateTypingStatus(true);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingStatus(false);
    }, 1000);
  };
  const reactToMessage = async (messageId, reaction) => {
    try {
      await axios.post(
        `${API_URL}/api/messages/${messageId}/react`,
        { reaction },
        { withCredentials: true }
      );
      fetchMessages(selectedConv.id);
    } catch (error) {
    }
  };
  const createNewConversation = async (e) => {
    e.preventDefault();
    if (!newChatEmail.trim()) return;
    try {
      const response = await axios.post(
        `${API_URL}/api/conversations`,
        {
          participant_ids: [newChatEmail], 
          type: 'direct'
        },
        { withCredentials: true }
      );
      setConversations([response.data.conversation, ...conversations]);
      setSelectedConv(response.data.conversation);
      setShowNewChat(false);
      setNewChatEmail('');
      toast.success('Conversation created!');
    } catch (error) {
      toast.error('Failed to create conversation');
    }
  };
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };
  const getPresenceStatus = (status) => {
    const colors = {
      online: 'bg-green-500',
      away: 'bg-yellow-500',
      offline: 'bg-gray-400'
    };
    return colors[status] || colors.offline;
  };
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <p className="text-lg">Please log in to access messages</p>
        </Card>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-background dark:to-background p-4">
      {}
      <AnimatePresence>
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-7xl mx-auto mb-4"
          >
            <div className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg flex items-center justify-center gap-2">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm font-medium">No connection - Messages may not sync</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="max-w-7xl mx-auto">
        <div className="bg-card dark:bg-card/50 dark:backdrop-blur-xl rounded-lg shadow-xl overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
          <div className="flex h-full">
            {}
            <div className="w-1/3 border-r border-border flex flex-col">
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">Messages</h2>
                    {isConnected && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Wifi className="h-3 w-3" />
                        Live
                      </Badge>
                    )}
                  </div>
                  <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        New
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>New Conversation</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={createNewConversation} className="space-y-4">
                        <Input
                          placeholder="Enter user ID"
                          value={newChatEmail}
                          onChange={(e) => setNewChatEmail(e.target.value)}
                        />
                        <Button type="submit" className="w-full">
                          Start Conversation
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${
                      selectedConv?.id === conv.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarImage src={conv.other_user?.avatar} />
                          <AvatarFallback>
                            {conv.other_user?.name?.charAt(0) || conv.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        {conv.other_user?.presence && (
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${getPresenceStatus(conv.other_user.presence.status)}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold truncate">
                            {conv.type === 'direct' ? conv.other_user?.name : conv.name}
                          </p>
                          {conv.last_message && (
                            <span className="text-xs text-gray-500">
                              {formatTime(conv.last_message.created_at)}
                            </span>
                          )}
                        </div>
                        {conv.last_message && (
                          <p className="text-sm text-gray-600 truncate">
                            {conv.last_message.content}
                          </p>
                        )}
                        {conv.unread_count > 0 && (
                          <span className="inline-block mt-1 px-2 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
            {}
            <div className="flex-1 flex flex-col">
              {selectedConv ? (
                <>
                  {}
                  <div className="p-4 border-b border-gray-200 bg-white">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={selectedConv.other_user?.avatar} />
                        <AvatarFallback>
                          {selectedConv.other_user?.name?.charAt(0) || selectedConv.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">
                          {selectedConv.type === 'direct' ? selectedConv.other_user?.name : selectedConv.name}
                        </h3>
                        {selectedConv.other_user?.presence && (
                          <p className="text-sm text-gray-500">
                            {selectedConv.other_user.presence.status}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {}
                  <ScrollArea className="flex-1 p-4 bg-gray-50">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`mb-4 flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${msg.sender_id === user.id ? 'order-2' : 'order-1'}`}>
                          {msg.sender_id !== user.id && (
                            <p className="text-xs text-gray-500 mb-1">{msg.sender_name}</p>
                          )}
                          <div
                            className={`rounded-lg p-3 ${
                              msg.sender_id === user.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-200'
                            }`}
                          >
                            <p className="break-words">{msg.content}</p>
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {msg.reactions.map((reaction, idx) => (
                                  <span key={idx} className="text-sm">
                                    {reaction.reaction}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500">
                              {formatTime(msg.created_at)}
                            </span>
                            {msg.sender_id === user.id && (
                              <div>
                                {msg.read_by && msg.read_by.length > 1 ? (
                                  <CheckCheck className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Check className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {typingUsers.length > 0 && (
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <div className="flex space-x-1">
                          <Circle className="w-2 h-2 animate-bounce" />
                          <Circle className="w-2 h-2 animate-bounce delay-75" />
                          <Circle className="w-2 h-2 animate-bounce delay-150" />
                        </div>
                        <span>{typingUsers[0].name} is typing...</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </ScrollArea>
                  {}
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <form onSubmit={sendMessage} className="flex items-center space-x-2">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={handleTyping}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={!newMessage.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center text-gray-500">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Select a conversation to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
