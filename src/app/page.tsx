'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // If not authenticated, show login prompt
      if (!session) {
        // Show landing page with login prompt
        return;
      }
    };
    
    checkAuth();
  }, [router]);

  if (!isClient) return null;

  return (
    <section id="dashboard" className="section active-section" style={{ display: 'block' }}>
      {/* Hero Section */}
      <div className="hero-panel">
        <div>
          <p className="eyebrow">🎯 Welcome to Debate Mate</p>
          <h2>Manage training, attendance, motions, and debate rounds — all in one place.</h2>
          <p>
            Built for UDF (Undip Debate Forum): weekly training schedule, motion bank, member achievements,
            shared timer, and AI-assisted transcript. Your complete debate operations platform.
          </p>
        </div>
        <div className="hero-metric">
          <span>Next Training</span>
          <strong>Fri, 19.00</strong>
          <small>BP Practice: Economy Motions</small>
        </div>
      </div>

      <div className="metric-grid">
        <article className="metric-card">
          <span>Attendance Rate</span>
          <strong>86%</strong>
          <p>Weekly training average</p>
        </article>
        <article className="metric-card">
          <span>Active Members</span>
          <strong>42</strong>
          <p>Member and EB accounts</p>
        </article>
        <article className="metric-card">
          <span>Motion Bank</span>
          <strong>128</strong>
          <p>Tagged by theme and format</p>
        </article>
        <article className="metric-card">
          <span>Achievements</span>
          <strong>31</strong>
          <p>Competition records</p>
        </article>
      </div>

      <div className="two-column">
        <article className="panel">
          <div className="panel-header">
            <h3>Upcoming Agenda</h3>
            <button className="ghost-button">View all</button>
          </div>
          <div className="agenda-list">
            <div className="agenda-item">
              <time>May 08</time>
              <div>
                <strong>Weekly Training</strong>
                <span>BP roles, extension building, whip strategy</span>
              </div>
            </div>
            <div className="agenda-item">
              <time>May 12</time>
              <div>
                <strong>Mattering Session</strong>
                <span>Digital economy and labor policy</span>
              </div>
            </div>
            <div className="agenda-item">
              <time>May 17</time>
              <div>
                <strong>Internal Sparring</strong>
                <span>AP format, novice-open mixed teams</span>
              </div>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h3>Recent Achievements</h3>
            <button className="ghost-button">Add record</button>
          </div>
          <div className="achievement-list">
            <div>
              <span className="rank-badge">1st</span>
              <strong>Java Overland Debate</strong>
              <p>Open Champion, BP Format</p>
            </div>
            <div>
              <span className="rank-badge silver">SF</span>
              <strong>National Varsity Cup</strong>
              <p>Semifinalist, AP Format</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
