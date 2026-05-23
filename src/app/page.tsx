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
  agendaTimeline: any[];
  recentAchievements: any[];
};

export default function Home() {
  const router = useRouter();
  const [metrics, setMetrics] = React.useState<DashboardMetric>({
    attendanceRate: 0,
    activeMembers: 0,
    motionCount: 0,
    achievementCount: 0,
    nextTraining: null,
    recentAchievements: [],
    agendaTimeline: [],
  });
  const [dashboardLoading, setDashboardLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadDashboard() {
      const { data: { session } } = await supabase.auth.getSession();
      const nowIso = new Date().toISOString();
      const [profilesResult, motionsResult, nextTrainingsResult, prevTrainingResult, attendanceResult, recentAchievementsResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved'),
        supabase.from('motions').select('id', { count: 'exact', head: true }),
        supabase.from('weekly_sessions').select('title, scheduled_at, notes').gte('scheduled_at', nowIso).order('scheduled_at', { ascending: true }).limit(2),
        supabase.from('weekly_sessions').select('title, scheduled_at, notes').lt('scheduled_at', nowIso).order('scheduled_at', { ascending: false }).limit(1).maybeSingle(),
        session
          ? supabase.from('attendance_records').select('status', { count: 'exact' })
          : Promise.resolve({ data: [], count: 0 }),
        supabase.from('competition_results')
          .select(`
            id,
            achievement_name,
            competition_teams (
              competitions (
                name,
                competition_date
              )
            )
          `, { count: 'exact' })
          .eq('is_achievement', true)
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      const activeMembers = profilesResult.count || 0;
      const achievementCount = (recentAchievementsResult.count || 0);
      const recentAchievements = recentAchievementsResult.data || [];
      const records = attendanceResult.data || [];
      const present = records.filter((record) => record.status === 'Present').length;

      const nextTrainings = nextTrainingsResult.data || [];
      const nextTrainingData = nextTrainings.length > 0 ? nextTrainings[0] : null;

      const agendaTimeline = [
        prevTrainingResult.data ? { ...prevTrainingResult.data, status: 'previous' } : null,
        nextTrainings.length > 0 ? { ...nextTrainings[0], status: 'current' } : null,
        nextTrainings.length > 1 ? { ...nextTrainings[1], status: 'next' } : null,
      ].filter(Boolean);

      setMetrics({
        attendanceRate: records.length > 0 ? Math.round((present / records.length) * 100) : 0,
        activeMembers: activeMembers,
        motionCount: motionsResult.count || 0,
        achievementCount,
        nextTraining: nextTrainingData,
        recentAchievements,
        agendaTimeline,
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
          <div className="agenda-timeline">
            {metrics.agendaTimeline.length > 0 ? (
              metrics.agendaTimeline.map((item, idx) => (
                <div key={idx} className={`timeline-item ${item.status}`}>
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <span className="timeline-status">{item.status.toUpperCase()}</span>
                    <strong>{item.title}</strong>
                    <time>{new Date(item.scheduled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--muted)' }}>Belum ada agenda terdekat.</p>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h3>Recent Achievements</h3>
            <button className="ghost-button" type="button" onClick={() => goToLoginIfNeeded('/achievements')}>Open base</button>
          </div>
          <div className="achievement-list">
            {metrics.recentAchievements.length > 0 ? (
              <div style={{ display: 'grid', gap: '12px' }}>
                {metrics.recentAchievements.map((ach) => {
                  const compName = Array.isArray(ach.competition_teams?.competitions) 
                    ? ach.competition_teams?.competitions[0]?.name 
                    : ach.competition_teams?.competitions?.name;
                  const compDate = Array.isArray(ach.competition_teams?.competitions) 
                    ? ach.competition_teams?.competitions[0]?.competition_date 
                    : ach.competition_teams?.competitions?.competition_date;
                  return (
                    <div key={ach.id} className="agenda-item">
                      <time>{compDate ? new Date(compDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' }) : '-'}</time>
                      <div>
                        <strong>{ach.achievement_name}</strong>
                        <span>{compName || 'Competition'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--muted)' }}>Belum ada achievement yang dicatat.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
