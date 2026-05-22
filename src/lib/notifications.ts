import { supabase } from '@/lib/supabaseClient';

export type NotificationType =
  | 'general'
  | 'system'
  | 'achievement'
  | 'training'
  | 'attendance'
  | 'calendar'
  | 'timer'
  | 'library'
  | 'profile'
  | 'admin';

export type NotificationPriority = 'low' | 'normal' | 'high';

type NotificationInput = {
  userId: string;
  title: string;
  message: string;
  link?: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  actionRequired?: boolean;
};

type BroadcastInput = Omit<NotificationInput, 'userId'>;

async function insertNotifications(rows: NotificationInput[]) {
  const payload = rows
    .filter((row) => row.userId && row.title && row.message)
    .map((row) => ({
      user_id: row.userId,
      title: row.title,
      message: row.message,
      link: row.link || null,
      type: row.type || 'general',
      priority: row.priority || 'normal',
      action_required: Boolean(row.actionRequired),
    }));

  if (payload.length === 0) return;

  const { error } = await supabase.from('notifications').insert(payload);
  if (error) {
    console.warn('Notification insert skipped:', error.message);
  }
}

export async function notifyUser(input: NotificationInput) {
  await insertNotifications([input]);
}

export async function notifyCurrentUser(input: BroadcastInput) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await notifyUser({ ...input, userId: session.user.id });
}

export async function notifyManyUsers(userIds: string[], input: BroadcastInput) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  await insertNotifications(uniqueIds.map((userId) => ({ ...input, userId })));
}

export async function notifyEbAdmins(input: BroadcastInput) {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id')
    .in('system_role', ['admin', 'eb']);

  if (error) {
    console.warn('EB/Admin notification lookup skipped:', error.message);
    return;
  }

  await notifyManyUsers(
    (data || []).map((profile) => profile.user_id).filter(Boolean) as string[],
    input,
  );
}

export async function notifyApprovedMembers(input: BroadcastInput) {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('approval_status', 'approved');

  if (error) {
    console.warn('Member notification lookup skipped:', error.message);
    return;
  }

  await notifyManyUsers(
    (data || []).map((profile) => profile.user_id).filter(Boolean) as string[],
    input,
  );
}
