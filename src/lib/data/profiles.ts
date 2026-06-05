import { supabase } from '@/lib/supabaseClient';
import type { Profile } from '@/lib/types';

export async function getApprovedProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('approval_status', 'approved')
    .order('name');

  if (error) throw error;
  return (data || []) as Profile[];
}

export async function getProfileByUserId(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
  if (error) throw error;
  return data as Profile;
}

