'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/lib/UserContext';
import { useToast } from '@/app/components/ToastContext';
import DashboardSkeleton from '@/app/components/DashboardSkeleton';
import { getDashboardMetrics, type DashboardMetric, type AchievementItem, type AgendaItem } from '@/lib/api/dashboard';

function firstItem<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

export default function Home() {
  const router = useRouter();
  const { profile } = useUser();
  const { addToast } = useToast();
  const [metrics, setMetrics] = React.useState<DashboardMetric>({
    attendanceRate: 0,
    attendancePresent: 0,
    attendanceTotal: 0,
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
      try {
        const { data, error } = await getDashboardMetrics();
        if (error) {
          addToast({
            title: 'Gagal Memuat Dashboard',
            message: error,
            type: 'error',
          });
          return;
        }
        if (data) {
          setMetrics(data);
        }
      } catch (err) {
        addToast({
          title: 'Error',
          message: 'Terjadi kesalahan tidak terduga saat memuat data.',
          type: 'error',
        });
      } finally {
        setDashboardLoading(false);
      }
    }

    void loadDashboard();
  }, [addToast]);

  async function goToLoginIfNeeded(path: string) {
    const { data: { session } } = await supabase.auth.getSession();
    router.push(session ? path : '/login');
  }

  const nextTrainingLabel = metrics.nextTraining
    ? new Date(metrics.nextTraining.scheduled_at).toLocaleString('id-ID', { weekday: 'short', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
    : 'Belum terjadwal';

  const metricDisplay = {
    attendanceRate: `${metrics.attendanceRate}%`,
    activeMembers: String(metrics.activeMembers),
    motionCount: String(metrics.motionCount),
    achievementCount: String(metrics.achievementCount),
  };
  const isOperator = profile?.system_role === 'eb' || profile?.system_role === 'admin';

  if (dashboardLoading) {
    return <DashboardSkeleton />;
  }

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
          <p>{dashboardLoading ? 'Calculating sessions' : `${metrics.attendancePresent} hadir dari ${metrics.attendanceTotal} expected attendance`}</p>
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
              <div style={{ color: 'var(--muted)', display: 'grid', gap: 8 }}>
                <strong>Belum ada agenda terdekat.</strong>
                <span>Agenda akan muncul setelah EB/Admin menambahkan weekly training atau event kalender.</span>
              </div>
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
                  const team = firstItem(ach.competition_teams);
                  const competition = firstItem(team?.competitions);
                  const compName = competition?.name;
                  const compDate = competition?.competition_date;
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
              <div style={{ padding: '40px 20px', textAlign: 'center', background: '#fbfcfb', border: '1px dashed rgba(23, 91, 69, 0.2)', borderRadius: '10px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.8 }}>🏆</div>
                <strong style={{ display: 'block', fontSize: '1.05rem', color: 'var(--ink)', marginBottom: '6px' }}>Belum Ada Achievement</strong>
                <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.9rem' }}>Tambahkan record dari Achievement Base.</span>
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
