'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Sidebar() {
  const pathname = usePathname();
  const [canSeeEbArea, setCanSeeEbArea] = useState(false);

  useEffect(() => {
    async function loadRole() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setCanSeeEbArea(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('system_role')
        .eq('user_id', session.user.id)
        .single();

      setCanSeeEbArea(profile?.system_role === 'eb' || profile?.system_role === 'admin');
    }

    loadRole();
  }, []);
  
  const navItems = [
    { label: 'Dashboard', path: '/' },
    { label: 'Debate Timer', path: '/timer' },
    { label: 'Presensi QR', path: '/presensi' },
    ...(canSeeEbArea ? [{ label: 'EB Area', path: '/eb-area' }] : []),
    { label: 'Calendar', path: '/calendar' },
    { label: 'Knowledge Base', path: '/library' },
    { label: 'Profiles', path: '/profile' },
    { label: 'AI Transcript', path: '/transcript' },
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
        Prototype capstone ready
      </div>
    </aside>
  );
}
