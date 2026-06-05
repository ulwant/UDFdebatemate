'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, type Notification } from '@/lib/UserContext';

function formatDate(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function notificationType(notification: Notification) {
  return notification.type || 'general';
}

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, unreadCount, hasMoreNotifications, markAsRead, markAllNotificationsAsRead, loadMoreNotifications } = useUser();
  const [filter, setFilter] = useState<'all' | 'unread' | 'action'>('all');

  const visibleNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter((item) => !item.is_read);
    if (filter === 'action') return notifications.filter((item) => item.action_required);
    return notifications;
  }, [filter, notifications]);

  async function openNotification(notification: Notification) {
    await markAsRead(notification.id);
    if (notification.link) router.push(notification.link);
  }

  return (
    <section className="section active-section" style={{ display: 'block' }}>
      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Notification Center</p>
            <h3>All notifications</h3>
          </div>
          <div className="actions">
            <div className="segmented" role="group" aria-label="Notification filters">
              <button className={`segment ${filter === 'all' ? 'active' : ''}`} type="button" onClick={() => setFilter('all')}>All</button>
              <button className={`segment ${filter === 'unread' ? 'active' : ''}`} type="button" onClick={() => setFilter('unread')}>Unread</button>
              <button className={`segment ${filter === 'action' ? 'active' : ''}`} type="button" onClick={() => setFilter('action')}>Action</button>
            </div>
            {unreadCount > 0 && <button className="secondary-button" type="button" onClick={markAllNotificationsAsRead}>Mark all read</button>}
          </div>
        </div>

        {visibleNotifications.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', background: 'white', border: '1px dashed rgba(23, 91, 69, 0.34)', borderRadius: '12px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
            <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '8px' }}>Belum Ada Notifikasi</strong>
            <span style={{ color: 'var(--muted)', display: 'block', maxWidth: '400px', margin: '0 auto' }}>
              Update training, presensi, submission, dan pengumuman admin akan muncul di sini.
            </span>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {visibleNotifications.map((notification) => (
              <button
                key={notification.id}
                className={`notification-item ${notification.is_read ? '' : 'unread'} ${notification.action_required ? 'action-required' : ''}`}
                type="button"
                onClick={() => { void openNotification(notification); }}
                style={{ borderColor: 'var(--line)', background: notification.is_read ? 'white' : '#f7fbf6' }}
              >
                <span className={`notification-marker ${notificationType(notification)}`} aria-hidden="true" />
                <span className="notification-content">
                  <span className="notification-row">
                    <strong>{notification.title}</strong>
                    <time>{formatDate(notification.created_at)}</time>
                  </span>
                  <span className="notification-message">{notification.message}</span>
                  <span className="notification-meta">{notificationType(notification)}{notification.action_required ? ' - action required' : ''}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {hasMoreNotifications && (
          <button className="secondary-button" type="button" onClick={loadMoreNotifications} style={{ marginTop: 14 }}>
            Load more notifications
          </button>
        )}
      </article>
    </section>
  );
}
