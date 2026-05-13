'use client';
import { usePathname } from 'next/navigation';

export default function Topbar() {
  const pathname = usePathname();

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

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Capstone Teknik Komputer UNDIP</p>
        <h1 id="page-title">{getPageTitle()}</h1>
      </div>
      <div className="user-pill">
        <span>EB</span>
        <strong>Naufal</strong>
      </div>
    </header>
  );
}
