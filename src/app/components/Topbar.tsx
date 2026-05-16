'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useUser } from '@/lib/UserContext';

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const { profile, notifications, unreadCount, markAsRead } = useUser();
  
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
    
    // Auto-close sidebar on navigate
    document.body.classList.remove('sidebar-open');
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pathname]);

  const getPageTitle = () => {
    if (pathname === '/') return "Debate operations, all in one place.";
    if (pathname.startsWith('/timer')) return "Flexible debate timer for solo drills and synced rooms.";
    if (pathname.startsWith('/presensi')) return "QR-based attendance for members and EB.";
    if (pathname.startsWith('/eb-area')) return "EB-only training planner and attendance operations.";
    if (pathname.startsWith('/calendar')) return "Weekly training and UDF activity calendar.";
    if (pathname.startsWith('/library')) return "A focused knowledge base replacing scattered notes.";
    if (pathname.startsWith('/profile')) return "Member profiles that work like debate CVs.";
    if (pathname.startsWith('/transcript')) return "AI-ready transcript workspace for debate audio.";
    if (pathname.startsWith('/my-profile')) return "Personal Dashboard - Manage your identity and history.";
    if (pathname.startsWith('/login')) return "Authenticate to your Debate Mate account.";
    return "Debate operations, all in one place.";
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

  return (
    <>
      <div 
        className="sidebar-overlay" 
        onClick={() => document.body.classList.remove('sidebar-open')} 
      />
      <header className="topbar">
        <div>
          <button className="hamburger-button" onClick={toggleSidebar} aria-label="Open Menu">
            ☰
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
              🔔
              {unreadCount > 0 && <span className="bell-indicator"></span>}
            </button>
            
            {showNotifications && (
              <div className="user-dropdown" style={{ width: '280px' }}>
                <div className="dropdown-header">
                  <strong>Notifications</strong>
                </div>
                {notifications.length === 0 ? (
                  <div className="dropdown-item" style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No notifications yet.</div>
                ) : (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.map(n => (
                      <button 
                        key={n.id} 
                        className="dropdown-item" 
                        style={{ flexDirection: 'column', alignItems: 'flex-start', opacity: n.is_read ? 0.6 : 1 }}
                        onClick={() => {
                          markAsRead(n.id);
                          setShowNotifications(false);
                          if (n.link) router.push(n.link);
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                          <strong>{n.title}</strong>
                          {!n.is_read && <span style={{ width: 6, height: 6, background: '#bf616a', borderRadius: '99px' }}></span>}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 'normal', whiteSpace: 'normal', textAlign: 'left' }}>
                          {n.message}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
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
                  <strong>{profile.system_role === 'admin' ? 'Administrator' : profile.system_role === 'eb' ? 'Executive Board' : 'Member'}</strong>
                </div>
                <Link href="/my-profile" className="dropdown-item" onClick={() => setIsOpen(false)}>
                  👤 My Profile
                </Link>
                {profile.system_role !== 'member' && (
                  <Link href="/eb-area" className="dropdown-item" onClick={() => setIsOpen(false)}>
                    ⚡ EB Dashboard
                  </Link>
                )}
                <button className="dropdown-item danger" onClick={handleLogout}>
                  🚪 Logout
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
