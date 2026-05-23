'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useUser, type Notification } from '@/lib/UserContext';

const NOTIFICATION_LABELS: Record<string, string> = {
  achievement: 'Achievement',
  admin: 'Admin',
  attendance: 'Presensi',
  calendar: 'Calendar',
  general: 'Update',
  library: 'Library',
  profile: 'Profile',
  system: 'System',
  timer: 'Timer',
  training: 'Training',
};

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return 'now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function getNotificationType(notification: Notification) {
  const haystack = `${notification.type || ''} ${notification.title} ${notification.message} ${notification.link || ''}`.toLowerCase();
  if (haystack.includes('achievement') || haystack.includes('record') || haystack.includes('submission')) return 'achievement';
  if (haystack.includes('presensi') || haystack.includes('attendance')) return 'attendance';
  if (haystack.includes('weekly') || haystack.includes('training')) return 'training';
  if (haystack.includes('calendar') || haystack.includes('event')) return 'calendar';
  if (haystack.includes('timer') || haystack.includes('room') || haystack.includes('lobby')) return 'timer';
  if (haystack.includes('library') || haystack.includes('motion')) return 'library';
  if (haystack.includes('profile') || haystack.includes('account') || haystack.includes('role')) return 'profile';
  if (haystack.includes('admin') || haystack.includes('review')) return 'admin';
  return notification.type || 'general';
}

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all');

  const { profile, notifications, unreadCount, markAsRead, markAllNotificationsAsRead } = useUser();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.body.classList.remove('sidebar-open');
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pathname]);

  const getPageTitle = () => {
    if (pathname === '/') return 'Debate operations, all in one place.';
    if (pathname.startsWith('/timer')) return 'Flexible debate timer for solo drills and synced rooms.';
    if (pathname.startsWith('/presensi')) return 'QR-based attendance for members and EB.';
    if (pathname.startsWith('/eb-area')) return 'EB-only training planner and attendance operations.';
    if (pathname.startsWith('/calendar')) return 'Weekly training and UDF activity calendar.';
    if (pathname.startsWith('/library')) return 'A focused knowledge base replacing scattered notes.';
    if (pathname.startsWith('/achievements')) return 'Searchable achievement base for UDF records.';
    if (pathname.startsWith('/profile')) return 'Member profiles that work like debate CVs.';
    if (pathname.startsWith('/transcript')) return 'AI-ready transcript workspace for debate audio.';
    if (pathname.startsWith('/my-profile')) return 'Personal Dashboard - Manage your identity and history.';
    if (pathname.startsWith('/login')) return 'Authenticate to your Debate Mate account.';
    return 'Debate operations, all in one place.';
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const toggleSidebar = () => {
    document.body.classList.toggle('sidebar-open');
  };

  const getRoleCode = (role: string) => {
    if (role === 'admin') return 'AD';
    if (role === 'eb') return 'EB';
    return 'MB';
  };

  const getFirstName = (name: string) => name.split(' ')[0] || 'User';

  const visibleNotifications = notificationFilter === 'unread'
    ? notifications.filter((notification) => !notification.is_read)
    : notifications;

  const openNotification = async (notification: Notification) => {
    await markAsRead(notification.id);
    setShowNotifications(false);
    if (notification.link) router.push(notification.link);
  };

  const notificationPanel = (
    <>
      <div className="notification-header">
        <div>
          <strong>Notifications</strong>
          <span>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</span>
        </div>
        <div className="notification-header-actions">
          {unreadCount > 0 && (
            <button type="button" onClick={markAllNotificationsAsRead}>Mark all read</button>
          )}
          <button className="notification-close" type="button" onClick={() => setShowNotifications(false)} aria-label="Close notifications">x</button>
        </div>
      </div>
      <div className="notification-tabs" role="tablist" aria-label="Notification filters">
        <button type="button" className={notificationFilter === 'all' ? 'active' : ''} onClick={() => setNotificationFilter('all')}>All</button>
        <button type="button" className={notificationFilter === 'unread' ? 'active' : ''} onClick={() => setNotificationFilter('unread')}>Unread</button>
      </div>
      {visibleNotifications.length === 0 ? (
        <div className="notification-empty">
          <strong>Belum ada notifikasi.</strong>
          <span>Update training, presensi, request, dan info EB akan muncul di sini.</span>
        </div>
      ) : (
        <div className="notification-list">
          {visibleNotifications.map((notification) => {
            const type = getNotificationType(notification);
            return (
              <button
                key={notification.id}
                className={`notification-item ${notification.is_read ? '' : 'unread'} ${notification.action_required ? 'action-required' : ''}`}
                type="button"
                onClick={() => { void openNotification(notification); }}
              >
                <span className={`notification-marker ${type}`} aria-hidden="true" />
                <span className="notification-content">
                  <span className="notification-row">
                    <strong>{notification.title}</strong>
                    <time>{formatRelativeTime(notification.created_at)}</time>
                  </span>
                  <span className="notification-message">{notification.message}</span>
                  <span className="notification-meta">
                    {NOTIFICATION_LABELS[type] || NOTIFICATION_LABELS.general}
                    {notification.action_required ? ' - Action required' : ''}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <>
      <div
        className="sidebar-overlay"
        onClick={() => document.body.classList.remove('sidebar-open')}
      />
      <header className="topbar">
        <div>
          <button className="hamburger-button" onClick={toggleSidebar} aria-label="Open Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <div>
            <p className="eyebrow">Capstone Teknik Komputer UNDIP</p>
            <h1 id="page-title">{getPageTitle()}</h1>
          </div>
        </div>

        {profile && (
          <div className="topbar-actions">
            <div className="user-pill-container" ref={notifRef}>
              <button
                className="bell-button"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notifications"
              >
                <span aria-hidden="true">!</span>
                {unreadCount > 0 && <span className="bell-indicator">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>

              {showNotifications && (
                  <div className="notification-popover">
                    {notificationPanel}
                  </div>
              )}
            </div>

            <div className="user-pill-container" ref={dropdownRef}>
              <div
                className={`user-pill ${getRoleCode(profile.system_role)}`}
                onClick={() => setIsOpen(!isOpen)}
                role="button"
                tabIndex={0}
              >
                <span>
                  {profile.profile_picture_url ? (
                    <img src={profile.profile_picture_url} alt="Avatar" className="user-pill-avatar" />
                  ) : (
                    getRoleCode(profile.system_role)
                  )}
                </span>
                <strong>{getFirstName(profile.name)}</strong>
              </div>

              {isOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <p>Logged in as</p>
                    <strong>
                      {profile.approval_status && profile.approval_status !== 'approved'
                        ? 'Waiting Approval'
                        : profile.system_role === 'admin' ? 'Administrator' : profile.system_role === 'eb' ? 'Executive Board' : 'Member'}
                    </strong>
                  </div>
                  <Link href="/my-profile" className="dropdown-item" onClick={() => setIsOpen(false)}>
                    My Profile
                  </Link>
                  {profile.system_role !== 'member' && (
                    <Link href="/eb-area" className="dropdown-item" onClick={() => setIsOpen(false)}>
                      EB Dashboard
                    </Link>
                  )}
                  <button className="dropdown-item danger" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
