'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type UserProfile = {
  id: string;
  name: string;
  system_role: string;
  approval_status?: 'pending_profile' | 'pending_approval' | 'approved' | 'rejected';
  batch?: string;
  member_type?: string;
  email?: string;
  profile_picture_url?: string;
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  link?: string;
  type?: string;
  priority?: string;
  action_required?: boolean;
  is_read: boolean;
  created_at: string;
};

type UserContextType = {
  profile: UserProfile | null;
  notifications: Notification[];
  unreadCount: number;
  hasMoreNotifications: boolean;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  profile: null,
  notifications: [],
  unreadCount: 0,
  hasMoreNotifications: false,
  loading: true,
  markAsRead: async () => {},
  markAllNotificationsAsRead: async () => {},
  refreshProfile: async () => {},
  refreshNotifications: async () => {},
  loadMoreNotifications: async () => {},
});

const NOTIFICATION_PAGE_SIZE = 10;

export const useUser = () => useContext(UserContext);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, system_role, approval_status, batch, member_type, profile_picture_url')
        .eq('user_id', session.user.id)
        .single();
        
      if (data) {
        setProfile({
          id: data.id,
          name: data.name || 'User',
          system_role: data.system_role || 'member',
          approval_status: data.approval_status || 'pending_approval',
          batch: data.batch || undefined,
          member_type: data.member_type || undefined,
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
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .range(0, NOTIFICATION_PAGE_SIZE);
        
      if (notifs) {
        const visibleNotifs = notifs.slice(0, NOTIFICATION_PAGE_SIZE);
        setNotifications(visibleNotifs);
        setUnreadCount(notifs.filter(n => !n.is_read).length);
        setHasMoreNotifications(notifs.length > NOTIFICATION_PAGE_SIZE);
      }
    }
  };

  const loadMoreNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const from = notifications.length;
    const to = from + NOTIFICATION_PAGE_SIZE;
    const { data: moreNotifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!moreNotifs) return;
    const visibleNotifs = moreNotifs.slice(0, NOTIFICATION_PAGE_SIZE);
    setNotifications(prev => [...prev, ...visibleNotifs]);
    setUnreadCount(prev => prev + visibleNotifs.filter(n => !n.is_read).length);
    setHasMoreNotifications(moreNotifs.length > NOTIFICATION_PAGE_SIZE);
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

  const markAllNotificationsAsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <UserContext.Provider value={{ 
      profile, 
      notifications, 
      unreadCount, 
      hasMoreNotifications,
      loading,
      markAsRead, 
      markAllNotificationsAsRead,
      refreshProfile: fetchProfile, 
      refreshNotifications: fetchNotifications,
      loadMoreNotifications,
    }}>
      {children}
    </UserContext.Provider>
  );
}
