'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/lib/UserContext';

function NavIcon({ path }: { path: string }) {
  const common = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (path === '/') return <svg {...common}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 10v10h14V10" /></svg>;
  if (path.startsWith('/timer')) return <svg {...common}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2" /><path d="M9 2h6" /></svg>;
  if (path.startsWith('/presensi')) return <svg {...common}><path d="M4 4h6v6H4z" /><path d="M14 4h6v6h-6z" /><path d="M4 14h6v6H4z" /><path d="M14 14h2" /><path d="M20 14v6h-6v-2" /></svg>;
  if (path.startsWith('/eb-area')) return <svg {...common}><path d="M12 3l8 4v6c0 5-3.5 7.5-8 8-4.5-.5-8-3-8-8V7z" /><path d="m9 12 2 2 4-4" /></svg>;
  if (path.startsWith('/audit-log')) return <svg {...common}><path d="M4 5h16" /><path d="M4 12h16" /><path d="M4 19h10" /></svg>;
  if (path.startsWith('/calendar')) return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg>;
  if (path.startsWith('/library')) return <svg {...common}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" /></svg>;
  if (path.startsWith('/achievements')) return <svg {...common}><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v6a5 5 0 0 1-10 0z" /><path d="M5 5H3v2a4 4 0 0 0 4 4" /><path d="M19 5h2v2a4 4 0 0 1-4 4" /></svg>;
  if (path.startsWith('/profile')) return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-8 0v2" /><circle cx="12" cy="7" r="4" /></svg>;
  if (path.startsWith('/transcript')) return <svg {...common}><path d="M12 3v10" /><path d="M8 7a4 4 0 0 1 8 0v4a4 4 0 0 1-8 0z" /><path d="M5 11a7 7 0 0 0 14 0" /></svg>;
  if (path.startsWith('/notifications')) return (
    <svg {...common} viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
  return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M6 21v-2a6 6 0 0 1 12 0v2" /></svg>;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { profile } = useUser();
  const canSeeEbArea = profile?.system_role === 'eb' || profile?.system_role === 'admin';
  const isApproved = profile?.approval_status === 'approved' || canSeeEbArea;
  const isAdmin = profile?.system_role === 'admin';
  const isGuest = profile?.member_type === 'guest';
  
  const navItems = isApproved
    ? (isGuest ? [
        { label: 'Debate Timer', path: '/timer' },
        { label: 'Presensi QR', path: '/presensi' },
        { label: 'Calendar', path: '/calendar' },
        { label: 'My Account', path: '/my-profile' },
      ] : [
        { label: 'Dashboard', path: '/' },
        { label: 'Debate Timer', path: '/timer' },
        { label: 'Presensi QR', path: '/presensi' },
        ...(canSeeEbArea ? [{ label: 'EB Area', path: '/eb-area' }] : []),
        ...(isAdmin ? [{ label: 'Audit Log', path: '/audit-log' }] : []),
        { label: 'Calendar', path: '/calendar' },
        { label: 'Knowledge Base', path: '/library' },
        { label: 'Achievement Base', path: '/achievements' },
        { label: 'Profiles', path: '/profile' },
        { label: 'Notifications', path: '/notifications' },
        { label: 'AI Transcript', path: '/transcript' },
        { label: 'My Account', path: '/my-profile' },
      ])
    : [
        { label: 'Dashboard', path: '/' },
        { label: 'My Account', path: '/my-profile' },
      ];

  return (
    <aside className="sidebar">
      <div className="brand" style={{ justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="brand-mark brand-logo" aria-hidden="true">
            <img src="/icon-192x192.png" alt="" />
          </div>
          <div>
            <p>Debate Mate</p>
            <span>Undip Debate Forum</span>
          </div>
        </div>
        <button 
          className="hamburger-button" 
          onClick={() => document.body.classList.remove('sidebar-open')}
          aria-label="Close Menu"
          style={{ padding: '8px' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <nav className="nav" aria-label="Primary navigation">
        {navItems.map((item) => {
          const isActive = item.path === '/' 
            ? pathname === '/' 
            : pathname.startsWith(item.path);
            
          return (
            <Link 
              key={item.path}
              href={item.path} 
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <NavIcon path={item.path} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-note">
        <span className="status-dot"></span>
        {isApproved ? 'Workspace ready' : 'Waiting for approval'}
      </div>
    </aside>
  );
}
