export type SystemRole = 'admin' | 'eb' | 'member' | 'guest' | string;
export type ApprovalStatus = 'pending_profile' | 'pending_approval' | 'approved' | 'rejected';

export type DiscordRole = {
  id?: string;
  name: string;
  color: string;
  assignable_by?: string;
};

export type Profile = {
  id?: string;
  user_id?: string;
  email?: string;
  name: string;
  caption?: string;
  profile_picture_url?: string;
  avatar_initials?: string;
  avatar_color?: string;
  system_role?: SystemRole;
  approval_status?: ApprovalStatus | string;
  batch?: string | null;
  member_type?: string | null;
  faculty?: string | null;
  major?: string | null;
  delegation_status?: string | null;
  birthdate?: string | null;
  username?: string | null;
  debating_experience?: string | null;
  rejection_reason?: string | null;
  discord_roles?: DiscordRole[];
};

export type WeeklySession = {
  id: string;
  title: string;
  scheduled_at: string;
  notes?: string | null;
  is_locked: boolean;
};

export type AttendanceStatus = 'Present' | 'Absent' | 'Excused';

export type AttendanceSession = {
  id: string;
  title: string;
  created_at?: string;
  weekly_session_id?: string | null;
  secret_token?: string;
  expires_at?: string;
};

export type AttendanceRecord = {
  id: string;
  session_id: string;
  user_id: string;
  status: AttendanceStatus | string;
  created_at?: string;
};

export type CalendarVisibility = 'public' | 'eb_admin';

export type CalendarEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  notes?: string | null;
  visibility: CalendarVisibility;
  created_by: string;
};

export type Motion = {
  id: string;
  text: string;
  motion_type?: string;
  primary_category?: string;
  secondary_category?: string;
  competition?: string;
  year?: string | number;
  tab_url?: string;
  created_by?: string;
};

export type MotionDraft = {
  text: string;
  motion_type: string;
  primary_categories: string[];
  secondary_categories: string[];
  competition: string;
  year: string;
  tab_url: string;
};

