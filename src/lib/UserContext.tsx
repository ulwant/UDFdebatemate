'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type UserProfile = {
  id: string;
  name: string;
  system_role: string;
  email?: string;
  profile_picture_url?: string;
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
};

type UserContextType = {
  profile: UserProfile | null;
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  profile: null,
  notifications: [],
  unreadCount: 0,
  loading: true,
  markAsRead: async () => {},
  refreshProfile: async () => {},
  refreshNotifications: async () => {},
});

export const useUser = () => useContext(UserContext);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, system_role, profile_picture_url')
        .eq('user_id', session.user.id)
        .single();
        
      if (data) {
        setProfile({
          id: data.id,
          name: data.name || 'User',
          system_role: data.system_role || 'member',
          email: session.user.email,
          profile_picture_url: data.profile_picture_url
        });
      }
    } else {
      setProfile(null);
    }
  };

  const fetchNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (notifs) {
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.is_read).length);
      }
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await fetchProfile();
      await fetchNotifications();
      setLoading(false);
    };
    
    initialize();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      initialize();
    });

    return () => subscription.unsubscribe();
  }, []);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return (
    <UserContext.Provider value={{ 
      profile, 
      notifications, 
      unreadCount, 
      loading,
      markAsRead, 
      refreshProfile: fetchProfile, 
      refreshNotifications: fetchNotifications 
    }}>
      {children}
    </UserContext.Provider>
  );
}
