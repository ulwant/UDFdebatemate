import { supabase } from '@/lib/supabaseClient';
import { fetchWithErrorHandling } from '@/lib/supabaseUtils';

export type DashboardMetric = {
  attendanceRate: number;
  attendancePresent: number;
  attendanceTotal: number;
  activeMembers: number;
  motionCount: number;
  achievementCount: number;
  nextTraining?: {
    title: string;
    scheduled_at: string;
    notes?: string | null;
  } | null;
  agendaTimeline: AgendaItem[];
  recentAchievements: AchievementItem[];
};

export type AgendaItem = {
  title: string;
  scheduled_at: string;
  notes?: string | null;
  status: 'previous' | 'current' | 'next';
};

export type AchievementItem = {
  id: string;
  achievement_name?: string | null;
  competition_teams?: {
    competitions?: {
      name?: string | null;
      competition_date?: string | null;
    } | null | Array<{
      name?: string | null;
      competition_date?: string | null;
    }>;
  } | null | Array<{
    competitions?: {
      name?: string | null;
      competition_date?: string | null;
    } | null | Array<{
      name?: string | null;
      competition_date?: string | null;
    }>;
  }>;
};

export type DiscordRole = {
  name: string;
};

export type DashboardProfile = {
  id: string;
  user_id?: string | null;
  batch?: string | null;
  member_type?: string | null;
  discord_roles?: DiscordRole[] | null;
};

export type SessionEvent = {
  title: string;
  scheduled_at: string;
  notes?: string | null;
};

export type WeeklySessionRow = {
  id: string;
  title?: string;
  scheduled_at: string;
  notes?: string | null;
};

export type AttendanceSessionRow = {
  id: string;
  weekly_session_id?: string | null;
};

export type AttendanceRecordRow = {
  user_id: string;
  status: string;
  session_id: string;
};

function isUdfProfile(profile: DashboardProfile) {
  if (profile.member_type === 'guest') return false;
  if (/^UDF\d+/i.test(profile.batch || '')) return true;
  return Boolean(profile.discord_roles?.some((role) => /^UDF\d+/i.test(role.name)));
}

export async function getDashboardMetrics(): Promise<{ data: DashboardMetric | null; error: string | null }> {
  try {
    const d = new Date();
    const nowIso = d.toISOString();
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();

    const [
      profilesRes,
      motionsRes,
      nextTrainingsRes,
      prevTrainingRes,
      achievementsRes,
      weeklySessionsRes,
    ] = await Promise.all([
      fetchWithErrorHandling<DashboardProfile[]>(
        supabase.from('profiles').select('id, user_id, batch, member_type, discord_roles').eq('approval_status', 'approved')
      ),
      fetchWithErrorHandling<any[]>(
        supabase.from('motions').select('id', { count: 'exact', head: true })
      ),
      fetchWithErrorHandling<SessionEvent[]>(
        supabase.from('weekly_sessions').select('title, scheduled_at, notes').gte('scheduled_at', nowIso).order('scheduled_at', { ascending: true }).limit(2)
      ),
      fetchWithErrorHandling<SessionEvent>(
        supabase.from('weekly_sessions').select('title, scheduled_at, notes').lt('scheduled_at', nowIso).order('scheduled_at', { ascending: false }).limit(1).maybeSingle()
      ),
      fetchWithErrorHandling<any[]>(
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
          .limit(3)
      ),
      fetchWithErrorHandling<WeeklySessionRow[]>(
        supabase.from('weekly_sessions').select('id, scheduled_at').gte('scheduled_at', monthStart).lt('scheduled_at', monthEnd)
      ),
    ]);

    // Check if any error occurred in critical tables
    if (profilesRes.error) return { data: null, error: profilesRes.error };
    if (motionsRes.error) return { data: null, error: motionsRes.error };

    const activeMembers = profilesRes.data?.length || 0;
    const allProfiles = (profilesRes.data || []) as DashboardProfile[];
    const attendanceProfiles = allProfiles.filter(isUdfProfile);

    const weeklySessions = (weeklySessionsRes.data || []) as WeeklySessionRow[];
    const weeklyIds = weeklySessions.map((w) => w.id);

    let attendanceRecords: AttendanceRecordRow[] = [];
    let attendanceSessions: AttendanceSessionRow[] = [];

    if (weeklyIds.length > 0) {
      const sessionsRes = await fetchWithErrorHandling(
        supabase
          .from('attendance_sessions')
          .select('id, weekly_session_id')
          .in('weekly_session_id', weeklyIds)
      );

      attendanceSessions = (sessionsRes.data || []) as AttendanceSessionRow[];

      if (attendanceSessions.length > 0) {
        const recordsRes = await fetchWithErrorHandling(
          supabase
            .from('attendance_records')
            .select('user_id, status, session_id')
            .in('session_id', attendanceSessions.map((s) => s.id))
        );
        attendanceRecords = (recordsRes.data || []) as AttendanceRecordRow[];
      }
    }

    const audienceUserIds = new Set(attendanceProfiles.map((profile) => profile.user_id).filter(Boolean));
    const scopedRecords = attendanceRecords.filter((record) => audienceUserIds.has(record.user_id));

    const completedWeeklySessionsCount = weeklySessions.filter(s => new Date(s.scheduled_at) < d).length;

    const present = scopedRecords.filter((record) => record.status === 'Present').length;
    const total = Math.max(attendanceProfiles.length * completedWeeklySessionsCount, scopedRecords.length);

    const achievementCount = achievementsRes.count || 0;
    const motionCount = motionsRes.count || 0;

    const nextTrainings = nextTrainingsRes.data || [];
    const nextTrainingData = nextTrainings.length > 0 ? nextTrainings[0] : null;

    const agendaTimeline = [
      prevTrainingRes.data ? { ...prevTrainingRes.data, status: 'previous' } : null,
      nextTrainings.length > 0 ? { ...nextTrainings[0], status: 'current' } : null,
      nextTrainings.length > 1 ? { ...nextTrainings[1], status: 'next' } : null,
    ].filter(Boolean) as AgendaItem[];

    return {
      data: {
        attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
        attendancePresent: present,
        attendanceTotal: total,
        activeMembers: activeMembers,
        motionCount: motionCount,
        achievementCount: achievementCount,
        nextTraining: nextTrainingData as any,
        recentAchievements: (achievementsRes.data || []) as any,
        agendaTimeline,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat memproses dashboard.',
    };
  }
}
