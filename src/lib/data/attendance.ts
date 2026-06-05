import { supabase } from '@/lib/supabaseClient';
import type { AttendanceRecord, AttendanceSession, WeeklySession } from '@/lib/types';

export function getMonthRange(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getWeeklySessionsForMonth(month: string) {
  const { start, end } = getMonthRange(month);
  const { data, error } = await supabase
    .from('weekly_sessions')
    .select('id, title, scheduled_at, notes, is_locked')
    .gte('scheduled_at', start)
    .lt('scheduled_at', end)
    .order('scheduled_at', { ascending: true });

  if (error) throw error;
  return (data || []) as WeeklySession[];
}

export async function getAttendanceSessionsByWeeklyIds(weeklyIds: string[]) {
  if (weeklyIds.length === 0) return [] as AttendanceSession[];
  const { data, error } = await supabase
    .from('attendance_sessions')
    .select('id, title, created_at, weekly_session_id')
    .in('weekly_session_id', weeklyIds)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as AttendanceSession[];
}

export async function getAttendanceRecordsBySessionIds(sessionIds: string[]) {
  if (sessionIds.length === 0) return [] as AttendanceRecord[];
  const { data, error } = await supabase
    .from('attendance_records')
    .select('id, session_id, user_id, status, created_at')
    .in('session_id', sessionIds);

  if (error) throw error;
  return (data || []) as AttendanceRecord[];
}

