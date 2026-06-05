import { supabase } from '@/lib/supabaseClient';
import type { CalendarEvent, WeeklySession } from '@/lib/types';

export function getCalendarMonthRangeWithPadding(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  start.setDate(start.getDate() - 7);
  const end = new Date(year, monthIndex, 1);
  end.setDate(end.getDate() + 7);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getCalendarData(month: string) {
  const { start, end } = getCalendarMonthRangeWithPadding(month);
  const [weeklyResult, eventResult] = await Promise.all([
    supabase
      .from('weekly_sessions')
      .select('id, title, scheduled_at, notes, is_locked')
      .gte('scheduled_at', start)
      .lt('scheduled_at', end)
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('calendar_events')
      .select('id, title, starts_at, ends_at, location, notes, visibility, created_by')
      .gte('starts_at', start)
      .lt('starts_at', end)
      .order('starts_at', { ascending: true }),
  ]);

  if (weeklyResult.error) throw weeklyResult.error;
  if (eventResult.error) throw eventResult.error;

  return {
    weeklySessions: (weeklyResult.data || []) as WeeklySession[],
    calendarEvents: (eventResult.data || []) as CalendarEvent[],
  };
}

