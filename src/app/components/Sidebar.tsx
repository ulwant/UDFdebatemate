'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/lib/UserContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { profile } = useUser();
  const canSeeEbArea = profile?.system_role === 'eb' || profile?.system_role === 'admin';
  const isApproved = profile?.approval_status === 'approved' || canSeeEbArea;
  const isAdmin = profile?.system_role === 'admin';
  
  const navItems = isApproved
    ? [
        { label: 'Dashboard', path: '/' },
        { label: 'Debate Timer', path: '/timer' },
        { label: 'Presensi QR', path: '/presensi' },
        ...(canSeeEbArea ? [{ label: 'EB Area', path: '/eb-area' }] : []),
        ...(isAdmin ? [{ label: 'Audit Log', path: '/audit-log' }] : []),
        { label: 'Calendar', path: '/calendar' },
        { label: 'Knowledge Base', path: '/library' },
        { label: 'Achievement Base', path: '/achievements' },
        { label: 'Profiles', path: '/profile' },
        { label: 'AI Transcript', path: '/transcript' },
        { label: 'My Account', path: '/my-profile' },
      ]
    : [
        { label: 'Dashboard', path: '/' },
        { label: 'My Account', path: '/my-profile' },
      ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">DM</div>
        <div>
          <p>Debate Mate</p>
          <span>Undip Debate Forum</span>
        </div>
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
