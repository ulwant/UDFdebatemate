import { supabase } from '@/lib/supabaseClient';

export async function getRecentAchievements(limit = 3) {
  const { data, error, count } = await supabase
    .from('competition_results')
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
    .limit(limit);

  if (error) throw error;
  return { data: data || [], count: count || 0 };
}

