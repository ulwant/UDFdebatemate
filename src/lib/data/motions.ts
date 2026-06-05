import { supabase } from '@/lib/supabaseClient';
import type { MotionDraft } from '@/lib/types';

export function motionDraftToPayload(draft: MotionDraft) {
  return {
    text: draft.text.trim(),
    motion_type: draft.motion_type,
    primary_category: draft.primary_categories.join(', '),
    secondary_category: draft.secondary_categories.join(', '),
    competition: draft.competition.trim(),
    year: draft.year ? parseInt(draft.year, 10) : null,
    tab_url: draft.tab_url.trim() || null,
  };
}

export async function submitMotionForReview(userId: string, draft: MotionDraft) {
  return supabase.from('motion_submissions').insert({
    submitted_by: userId,
    draft: motionDraftToPayload(draft),
    status: 'pending',
  });
}
