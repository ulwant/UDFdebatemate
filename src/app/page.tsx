'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type DashboardMetric = {
  attendanceRate: number;
  activeMembers: number;
  motionCount: number;
  achievementCount: number;
  nextTraining?: {
    title: string;
    scheduled_at: string;
    notes?: string | null;
  } | null;
};

export default function Home() {
  const router = useRouter();
  const [metrics, setMetrics] = React.useState<DashboardMetric>({
    attendanceRate: 0,
    activeMembers: 0,
    motionCount: 0,
    achievementCount: 0,
    nextTraining: null,
  });
  const [dashboardLoading, setDashboardLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadDashboard() {
      const { data: { session } } = await supabase.auth.getSession();
      const nowIso = new Date().toISOString();
      const [profilesResult, motionsResult, nextTrainingResult, attendanceResult] = await Promise.all([
        supabase.from('profiles').select('id, achievements', { count: 'exact' }).eq('approval_status', 'approved'),
        supabase.from('motions').select('id', { count: 'exact', head: true }),
        supabase.from('weekly_sessions').select('title, scheduled_at, notes').gte('scheduled_at', nowIso).order('scheduled_at', { ascending: true }).limit(1).maybeSingle(),
        session
          ? supabase.from('attendance_records').select('status', { count: 'exact' })
          : Promise.resolve({ data: [], count: 0 }),
      ]);

      const profiles = profilesResult.data || [];
      const achievementCount = profiles.reduce((total, profile) => {
        const achievements = Array.isArray(profile.achievements) ? profile.achievements : [];
        return total + achievements.length;
      }, 0);
      const records = attendanceResult.data || [];
      const present = records.filter((record) => record.status === 'Present').length;

      setMetrics({
        attendanceRate: records.length > 0 ? Math.round((present / records.length) * 100) : 0,
        activeMembers: profilesResult.count || profiles.length,
        motionCount: motionsResult.count || 0,
        achievementCount,
        nextTraining: nextTrainingResult.data || null,
      });
      setDashboardLoading(false);
    }

    void loadDashboard();
  }, []);

  async function goToLoginIfNeeded(path: string) {
    const { data: { session } } = await supabase.auth.getSession();
    router.push(session ? path : '/login');
  }

  const nextTrainingLabel = metrics.nextTraining
    ? new Date(metrics.nextTraining.scheduled_at).toLocaleString('id-ID', { weekday: 'short', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
    : 'Belum terjadwal';

  const metricDisplay = dashboardLoading
    ? { attendanceRate: '...', activeMembers: '...', motionCount: '...', achievementCount: '...' }
    : {
        attendanceRate: `${metrics.attendanceRate}%`,
        activeMembers: String(metrics.activeMembers),
        motionCount: String(metrics.motionCount),
        achievementCount: String(metrics.achievementCount),
      };

  return (
    <section id="dashboard" className="section active-section" style={{ display: 'block' }}>
      <div className="hero-panel">
        <div>
          <p className="eyebrow">Welcome to Debate Mate</p>
          <h2>Manage training, attendance, motions, and debate rounds in one place.</h2>
          <p>
            Built for UDF (Undip Debate Forum): weekly training schedule, motion bank, member achievements,
            shared timer, and AI-assisted transcript. Your complete debate operations platform.
          </p>
        </div>
        <div className="hero-metric">
          <span>Next Training</span>
          <strong>{nextTrainingLabel}</strong>
          <small>{metrics.nextTraining?.title || 'Tambahkan weekly dari EB Area'}</small>
        </div>
      </div>

      <div className="metric-grid">
        <article className="metric-card">
          <span>Attendance Rate</span>
          <strong>{metricDisplay.attendanceRate}</strong>
          <p>Present records average</p>
        </article>
        <article className="metric-card">
          <span>Active Members</span>
          <strong>{metricDisplay.activeMembers}</strong>
          <p>Approved member and EB accounts</p>
        </article>
        <article className="metric-card">
          <span>Motion Bank</span>
          <strong>{metricDisplay.motionCount}</strong>
          <p>Tagged by theme and format</p>
        </article>
        <article className="metric-card">
          <span>Achievements</span>
          <strong>{metricDisplay.achievementCount}</strong>
          <p>Competition records</p>
        </article>
      </div>

      <div className="two-column">
        <article className="panel">
          <div className="panel-header">
            <h3>Upcoming Agenda</h3>
            <button className="ghost-button" type="button" onClick={() => goToLoginIfNeeded('/calendar')}>View all</button>
          </div>
          <div className="agenda-list">
            {metrics.nextTraining ? (
              <div className="agenda-item">
                <time>{new Date(metrics.nextTraining.scheduled_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</time>
                <div>
                  <strong>{metrics.nextTraining.title}</strong>
                  <span>{metrics.nextTraining.notes || 'Weekly training terdekat'}</span>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--muted)' }}>Belum ada weekly training berikutnya.</p>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h3>Recent Achievements</h3>
            <button className="ghost-button" type="button" onClick={() => goToLoginIfNeeded('/achievements')}>Open base</button>
          </div>
          <div className="achievement-list">
            <p style={{ color: 'var(--muted)' }}>
              Achievement summary sekarang dihitung dari profil member. Detail lengkapnya bisa discan, difilter, dan diurutkan dari Achievement Base.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
