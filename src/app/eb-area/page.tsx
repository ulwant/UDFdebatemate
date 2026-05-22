'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { notifyApprovedMembers, notifyManyUsers, notifyUser } from '@/lib/notifications';
import styles from '../my-profile/MyProfile.module.css';

const ATTENDANCE_STATUSES = [
  { value: 'Present', label: 'Hadir' },
  { value: 'Absent', label: 'Tidak hadir' },
  { value: 'Excused', label: 'Izin' },
];

const ROLE_COLOR_PALETTE = [
  '#99aab5', '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e91e63', '#f1c40f', '#e67e22', '#e74c3c', '#95a5a6',
  '#607d8b', '#00897b', '#218c53', '#21618c', '#6c3483', '#ad1457', '#b9770e', '#af601a', '#a93226', '#7f8c8d',
];

type AttendanceStatus = 'Present' | 'Absent' | 'Excused';

type DiscordRole = {
  id?: string;
  name: string;
  color: string;
  assignable_by?: string;
};

type Profile = {
  id?: string;
  user_id?: string;
  name: string;
  caption?: string;
  profile_picture_url?: string;
  avatar_initials?: string;
  avatar_color?: string;
  system_role?: string;
  approval_status?: string;
  batch?: string | null;
  member_type?: string | null;
  debating_experience?: string | null;
  rejection_reason?: string | null;
  discord_roles?: DiscordRole[];
};

type CompetitionSubmissionDraft = {
  record_kind?: 'history' | 'achievement' | 'edit_request' | 'join_request' | 'delete_request';
  original_record_id?: string;
  competition_name?: string;
  competition_date?: string;
  tab_url?: string;
  team_name?: string;
  participant_names?: string;
  internal_teammate_ids?: string[];
  role?: string;
  category?: string;
  format_type?: string;
  achievement_name?: string;
  documentation_url?: string;
  is_achievement?: boolean;
};

type CompetitionSubmission = {
  id: string;
  submitted_by: string;
  draft: CompetitionSubmissionDraft;
  status: 'pending' | 'approved' | 'rejected';
  review_note?: string | null;
  created_at: string;
};

type CompetitionOption = {
  id: string;
  name: string;
  competition_date?: string | null;
  tab_url?: string | null;
};

type CompetitionTeamOption = {
  id: string;
  competition_id: string;
  team_name: string;
  category?: string | null;
  format_type?: string | null;
};

type OriginalParticipant = {
  profile_id?: string | null;
  display_name?: string | null;
  role?: string | null;
  profiles?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

type OriginalCompetitionResult = {
  id: string;
  achievement_name?: string | null;
  result_type?: string | null;
  documentation_url?: string | null;
  is_achievement?: boolean | null;
  team_id?: {
    id: string;
    team_name?: string | null;
    category?: string | null;
    format_type?: string | null;
    competition_id?: {
      id: string;
      name?: string | null;
      competition_date?: string | null;
      tab_url?: string | null;
    } | Array<{
      id: string;
      name?: string | null;
      competition_date?: string | null;
      tab_url?: string | null;
    }> | null;
    competition_participants?: OriginalParticipant[] | null;
  } | Array<{
    id: string;
    team_name?: string | null;
    category?: string | null;
    format_type?: string | null;
    competition_id?: {
      id: string;
      name?: string | null;
      competition_date?: string | null;
      tab_url?: string | null;
    } | Array<{
      id: string;
      name?: string | null;
      competition_date?: string | null;
      tab_url?: string | null;
    }> | null;
    competition_participants?: OriginalParticipant[] | null;
  }> | null;
};

type AttendanceSession = {
  id: string;
  title: string;
  created_at: string;
  weekly_session_id?: string | null;
};

type AttendanceRecord = {
  id: string;
  session_id: string;
  user_id: string;
  status: AttendanceStatus | string;
  created_at: string;
};

type WeeklySession = {
  id: string;
  title: string;
  scheduled_at: string;
  notes?: string | null;
  is_locked: boolean;
};

type WeeklyDraft = {
  title: string;
  scheduled_at: string;
  notes: string;
};

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function firstItem<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function normalizeCompareValue(value?: string | null) {
  return (value || '').trim();
}

function getMonthRange(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function getInitials(name?: string) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

function statusLabel(status?: string) {
  return ATTENDANCE_STATUSES.find((item) => item.value === status)?.label || 'Belum ada';
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function EbAreaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [weeklySessions, setWeeklySessions] = useState<WeeklySession[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [roleOptions, setRoleOptions] = useState<DiscordRole[]>([]);
  const [attendanceMessage, setAttendanceMessage] = useState('');
  const [newWeeklyTitle, setNewWeeklyTitle] = useState('');
  const [newWeeklyDate, setNewWeeklyDate] = useState('');
  const [newWeeklyNotes, setNewWeeklyNotes] = useState('');
  const [editingWeeklyId, setEditingWeeklyId] = useState<string | null>(null);
  const [weeklyDraft, setWeeklyDraft] = useState<WeeklyDraft>({ title: '', scheduled_at: '', notes: '' });
  const [selectedMemberHistoryId, setSelectedMemberHistoryId] = useState('');
  const [attendanceViewMode, setAttendanceViewMode] = useState<'matrix' | 'history'>('matrix');
  
  // EB Area Navigation Tabs
  const [activeAreaTab, setActiveAreaTab] = useState<'attendance' | 'registrations' | 'competitionReview' | 'roles' | 'authority'>('attendance');
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [competitionSubmissions, setCompetitionSubmissions] = useState<CompetitionSubmission[]>([]);
  const [competitionOptions, setCompetitionOptions] = useState<CompetitionOption[]>([]);
  const [competitionTeamOptions, setCompetitionTeamOptions] = useState<CompetitionTeamOption[]>([]);
  const [reviewSelections, setReviewSelections] = useState<Record<string, { competitionId: string; teamId: string; linkedProfileIds: string[]; note: string }>>({});
  const [reviewingSubmissionId, setReviewingSubmissionId] = useState<string | null>(null);
  const [originalRecords, setOriginalRecords] = useState<Record<string, OriginalCompetitionResult>>({});

  // Role Management State
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleEditTab, setRoleEditTab] = useState<'display' | 'permissions' | 'members'>('display');
  const [editingRoleName, setEditingRoleName] = useState('');
  const [editingRoleColor, setEditingRoleColor] = useState('#175b45');
  const [newRoleName, setNewRoleName] = useState('');
  const [memberToAdd, setMemberToAdd] = useState('');

  const isAdmin = currentUserRole === 'admin';

  useEffect(() => {
    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('system_role')
        .eq('user_id', session.user.id)
        .single();

      if (profile?.system_role !== 'eb' && profile?.system_role !== 'admin') {
        router.push('/my-profile');
        return;
      }

      setUserId(session.user.id);
      setCurrentUserRole(profile.system_role);
      setLoading(false);
    }

    loadSession();
  }, [router]);

  useEffect(() => {
    if (!userId || loading) return;
    // Run both fetches in parallel
    Promise.all([fetchAttendance(), fetchRoles(), fetchCompetitionReviewData()]).catch(console.error);
  }, [userId, selectedMonth, loading]);

  async function fetchRoles() {
    const { data } = await supabase.from('discord_roles').select('*').order('name', { ascending: true });
    if (data) setRoleOptions(data);
  }

  async function fetchCompetitionReviewData() {
    const [submissionsResult, competitionsResult, teamsResult] = await Promise.all([
      supabase.from('competition_submissions').select('id, submitted_by, draft, status, review_note, created_at').order('created_at', { ascending: false }),
      supabase.from('competitions').select('id, name, competition_date, tab_url').order('competition_date', { ascending: false }),
      supabase.from('competition_teams').select('id, competition_id, team_name, category, format_type').order('team_name', { ascending: true }),
    ]);

    if (!submissionsResult.error) {
      const submissions = (submissionsResult.data || []) as CompetitionSubmission[];
      setCompetitionSubmissions(submissions);

      const requestsWithOriginal = submissions.filter(s => 
        (s.draft.record_kind === 'edit_request' || s.draft.record_kind === 'join_request' || s.draft.record_kind === 'delete_request') 
        && s.status === 'pending'
      );
      const originalIds = Array.from(new Set(requestsWithOriginal.map(s => s.draft.original_record_id).filter(Boolean)));
      if (originalIds.length > 0) {
        const { data: resultsData } = await supabase
          .from('competition_results')
          .select(`
            id,
            achievement_name,
            documentation_url,
            is_achievement,
            team_id (
              id, team_name, category, format_type,
              competition_id (id, name, competition_date, tab_url),
              competition_participants (profile_id, display_name, role, profiles (name))
            )
          `)
          .in('id', originalIds);
        
        if (resultsData) {
          const dict: Record<string, OriginalCompetitionResult> = {};
          (resultsData as unknown as OriginalCompetitionResult[]).forEach((record) => { dict[record.id] = record; });
          setOriginalRecords(dict);
        }
      }
    }
    if (!competitionsResult.error) setCompetitionOptions((competitionsResult.data || []) as CompetitionOption[]);
    if (!teamsResult.error) setCompetitionTeamOptions((teamsResult.data || []) as CompetitionTeamOption[]);
  }

  async function fetchAttendance() {
    const { start, end } = getMonthRange(selectedMonth);
    
    // Run first batch of queries in parallel
    const [weeklyResult, profilesResult] = await Promise.all([
      supabase
        .from('weekly_sessions')
        .select('id, title, scheduled_at, notes, is_locked')
        .gte('scheduled_at', start)
        .lt('scheduled_at', end)
        .order('scheduled_at', { ascending: true }),
      supabase
        .from('profiles')
        .select('id, user_id, name, caption, profile_picture_url, avatar_initials, avatar_color, system_role, approval_status, batch, member_type, debating_experience, rejection_reason, discord_roles')
        .order('name', { ascending: true }),
    ]);

    const weeklySessionRows = (weeklyResult.data || []) as WeeklySession[];
    const profileRows = (profilesResult.data || []) as Profile[];
    
    setWeeklySessions(weeklySessionRows);
    setAllProfiles(profileRows);

    const weeklyIds = weeklySessionRows.map((item) => item.id);
    
    // Fetch attendance sessions based on weekly sessions
    const sessionsQuery = weeklyIds.length > 0
      ? supabase
        .from('attendance_sessions')
        .select('id, title, created_at, weekly_session_id')
        .in('weekly_session_id', weeklyIds)
        .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] });

    const { data: sessions } = await sessionsQuery;
    const sessionRows = (sessions || []) as AttendanceSession[];
    setAttendanceSessions(sessionRows);

    if (sessionRows.length === 0) {
      setAttendanceRecords([]);
      return;
    }

    // Fetch attendance records
    const { data: records } = await supabase
      .from('attendance_records')
      .select('id, session_id, user_id, status, created_at')
      .in('session_id', sessionRows.map((item) => item.id));

    setAttendanceRecords((records || []) as AttendanceRecord[]);
  }

  // Role Management Functions
  async function createDiscordRole() {
    const cleanedName = newRoleName.trim();
    if (!cleanedName) return;

    if (roleOptions.find((role) => role.name.toLowerCase() === cleanedName.toLowerCase())) {
      setAttendanceMessage('Role sudah ada.');
      return;
    }

    const { error } = await supabase.from('discord_roles').insert({ name: cleanedName, color: '#99aab5', created_by: userId });
    if (error) {
      setAttendanceMessage(`Gagal membuat role: ${error.message}`);
      return;
    }
    
    setNewRoleName('');
    await fetchRoles();
  }

  function selectRole(role: DiscordRole) {
    setSelectedRoleId(role.id!);
    setEditingRoleName(role.name);
    setEditingRoleColor(role.color);
    setRoleEditTab('display');
  }

  async function saveRoleDisplay() {
    if (!selectedRoleId) return;
    const { error } = await supabase.from('discord_roles').update({ name: editingRoleName, color: editingRoleColor }).eq('id', selectedRoleId);
    if (error) {
      setAttendanceMessage(`Gagal update role: ${error.message}`);
      return;
    }
    setAttendanceMessage('Role berhasil diupdate.');
    
    // Also update all profiles that have this role to reflect the new name/color
    const oldRole = roleOptions.find(r => r.id === selectedRoleId);
    if (oldRole && (oldRole.name !== editingRoleName || oldRole.color !== editingRoleColor)) {
      const nextRole = { id: selectedRoleId, name: editingRoleName, color: editingRoleColor };
      await Promise.all(allProfiles.map(async (p) => {
        const roles = p.discord_roles || [];
        if (roles.some(r => r.id === selectedRoleId || r.name === oldRole.name)) {
          const newRoles = roles.map(r => (r.id === selectedRoleId || r.name === oldRole.name) ? nextRole : r);
          await supabase.from('profiles').update({ discord_roles: newRoles }).eq('id', p.id);
        }
      }));
      await fetchAttendance(); // refresh profiles
    }
    await fetchRoles();
  }

  async function deleteDiscordRole() {
    if (!selectedRoleId) return;
    const role = roleOptions.find(r => r.id === selectedRoleId);
    if (!role) return;

    const { error } = await supabase.from('discord_roles').delete().eq('id', selectedRoleId);
    if (error) {
      setAttendanceMessage(`Gagal hapus role: ${error.message}`);
      return;
    }

    // Remove from profiles
    await Promise.all(allProfiles.map(async (p) => {
      const roles = p.discord_roles || [];
      if (roles.some(r => r.id === selectedRoleId || r.name === role.name)) {
        const newRoles = roles.filter(r => r.id !== selectedRoleId && r.name !== role.name);
        await supabase.from('profiles').update({ discord_roles: newRoles }).eq('id', p.id);
      }
    }));

    setSelectedRoleId(null);
    await fetchRoles();
    await fetchAttendance();
    setAttendanceMessage('Role berhasil dihapus.');
  }

  async function assignRoleToMember() {
    if (!selectedRoleId || !memberToAdd) return;
    const role = roleOptions.find(r => r.id === selectedRoleId);
    const memberProfile = allProfiles.find(p => p.id === memberToAdd);
    if (!role || !memberProfile) return;

    // Enforce Hierarchy
    const roleNameLower = role.name.toLowerCase();
    if (roleNameLower.includes('admin') && !isAdmin) {
      setAttendanceMessage('Hanya Admin yang dapat meng-assign role ADMIN.');
      return;
    }
    if (roleNameLower.includes('eb') && !isAdmin) {
      setAttendanceMessage('Hanya Admin yang dapat meng-assign role EB.');
      return;
    }

    const existingRoles = memberProfile.discord_roles || [];
    if (existingRoles.some(r => r.id === role.id || r.name === role.name)) {
      setAttendanceMessage('Member sudah memiliki role ini.');
      return;
    }

    const newRoles = [...existingRoles, role];
    const { error } = await supabase.from('profiles').update({ discord_roles: newRoles }).eq('id', memberProfile.id);
    if (error) {
      setAttendanceMessage(`Gagal assign role: ${error.message}`);
      return;
    }

    setMemberToAdd('');
    setAttendanceMessage(`Role berhasil ditambahkan ke ${memberProfile.name}.`);
    await fetchAttendance();
  }

  async function removeRoleFromMember(memberProfileId: string) {
    if (!selectedRoleId) return;
    const role = roleOptions.find(r => r.id === selectedRoleId);
    const memberProfile = allProfiles.find(p => p.id === memberProfileId);
    if (!role || !memberProfile) return;

    // Enforce Hierarchy
    const roleNameLower = role.name.toLowerCase();
    if ((roleNameLower.includes('admin') || roleNameLower.includes('eb')) && !isAdmin) {
      setAttendanceMessage('Hanya Admin yang dapat mencabut role ADMIN/EB.');
      return;
    }

    const existingRoles = memberProfile.discord_roles || [];
    const newRoles = existingRoles.filter(r => r.id !== role.id && r.name !== role.name);
    
    const { error } = await supabase.from('profiles').update({ discord_roles: newRoles }).eq('id', memberProfile.id);
    if (error) {
      setAttendanceMessage(`Gagal mencabut role: ${error.message}`);
      return;
    }

    setAttendanceMessage(`Role berhasil dicabut dari ${memberProfile.name}.`);
    await fetchAttendance();
  }

  // Attendance Functions
  async function updateUserSystemRole(profileId: string, newRole: string) {
    if (!isAdmin) {
      setAttendanceMessage('Hanya Admin yang dapat mengubah system role.');
      return;
    }
    const targetProfile = allProfiles.find((profile) => profile.id === profileId);
    const { error } = await supabase.from('profiles').update({ system_role: newRole }).eq('id', profileId);
    if (error) {
      setAttendanceMessage(`Gagal mengubah system role: ${error.message}`);
      return;
    }
    if (targetProfile?.user_id) {
      await notifyUser({
        userId: targetProfile.user_id,
        title: 'Role Updated',
        message: `Your Debate Mate role is now ${newRole.toUpperCase()}.`,
        link: '/my-profile',
        type: 'system',
      });
    }
    setAttendanceMessage('System role berhasil diupdate.');
    await fetchAttendance(); // refresh profiles
  }

  async function approveProfile(profileId: string) {
    const targetProfile = allProfiles.find((profile) => profile.id === profileId);
    const { error } = await supabase
      .from('profiles')
      .update({
        approval_status: 'approved',
        rejection_reason: null,
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', profileId);

    if (error) {
      setAttendanceMessage(`Gagal approve akun: ${error.message}`);
      return;
    }

    setAttendanceMessage('Akun berhasil di-approve.');
    if (targetProfile?.user_id) {
      await notifyUser({
        userId: targetProfile.user_id,
        title: 'Account Approved',
        message: 'Akun Debate Mate kamu sudah disetujui. Fitur utama sudah bisa dipakai.',
        link: '/my-profile',
        type: 'system',
      });
    }
    await fetchAttendance();
  }

  async function rejectProfile(profileId: string) {
    if (!window.confirm('Apakah Anda yakin ingin me-reject profil ini?')) return;
    const reason = rejectionReasons[profileId]?.trim() || 'Registration rejected by EB/Admin.';
    const targetProfile = allProfiles.find((profile) => profile.id === profileId);
    
    setAttendanceMessage('Rejecting profile...');
    const { error } = await supabase
      .from('profiles')
      .update({
        approval_status: 'rejected',
        rejection_reason: reason,
        approved_by: null,
        approved_at: null,
      })
      .eq('id', profileId);

    if (error) {
      setAttendanceMessage(`Gagal reject akun: ${error.message}`);
      return;
    }

    setAttendanceMessage('Akun berhasil di-reject.');
    if (targetProfile?.user_id) {
      await notifyUser({
        userId: targetProfile.user_id,
        title: 'Account Needs Revision',
        message: `Profil kamu perlu direvisi. Catatan EB/Admin: ${reason}`,
        link: '/my-profile',
        type: 'profile',
        priority: 'high',
        actionRequired: true,
      });
    }
    await fetchAttendance();
  }

  function getSubmitterProfile(submittedBy: string) {
    return allProfiles.find((profile) => profile.user_id === submittedBy);
  }

  function getSubmissionKindLabel(submission: CompetitionSubmission) {
    if (submission.draft.record_kind === 'edit_request') return 'edit';
    if (submission.draft.record_kind === 'join_request') return 'join';
    if (submission.draft.record_kind === 'delete_request') return 'delete';
    return submission.draft.is_achievement ? 'achievement' : 'record';
  }

  async function notifySubmissionApproved(submission: CompetitionSubmission, detail: string) {
    await notifyUser({
      userId: submission.submitted_by,
      title: 'Request Approved',
      message: detail,
      link: '/my-profile',
      type: 'achievement',
    });
  }

  async function notifyLinkedTeammates(submission: CompetitionSubmission, linkedProfileIds: string[]) {
    const teammateUserIds = linkedProfileIds
      .map((profileId) => allProfiles.find((profile) => profile.id === profileId)?.user_id)
      .filter((targetUserId): targetUserId is string => Boolean(targetUserId && targetUserId !== submission.submitted_by));

    await notifyManyUsers(teammateUserIds, {
      title: 'Added to Record',
      message: `You were linked to "${submission.draft.competition_name || 'a UDF record'}" in Debate Mate.`,
      link: '/my-profile',
      type: 'profile',
    });
  }

  function getReviewSelection(submission: CompetitionSubmission) {
    const submitterProfile = getSubmitterProfile(submission.submitted_by);
    const internalTeammates = submission.draft.internal_teammate_ids || [];
    const defaultLinkedProfileIds = submitterProfile?.id 
      ? Array.from(new Set([submitterProfile.id, ...internalTeammates]))
      : internalTeammates;

    return reviewSelections[submission.id] || {
      competitionId: '',
      teamId: '',
      linkedProfileIds: defaultLinkedProfileIds,
      note: '',
    };
  }

  function setReviewSelection(submissionId: string, patch: Partial<{ competitionId: string; teamId: string; linkedProfileIds: string[]; note: string }>) {
    setReviewSelections((current) => ({
      ...current,
      [submissionId]: {
        competitionId: current[submissionId]?.competitionId || '',
        teamId: current[submissionId]?.teamId || '',
        linkedProfileIds: current[submissionId]?.linkedProfileIds || [],
        note: current[submissionId]?.note || '',
        ...patch,
      },
    }));
  }

  function findDuplicateHints(submission: CompetitionSubmission) {
    const draft = submission.draft;
    const competitionName = (draft.competition_name || '').trim().toLowerCase();
    const teamName = (draft.team_name || '').trim().toLowerCase();
    const sameCompetition = competitionOptions.filter((competition) => competition.name.trim().toLowerCase() === competitionName);
    const sameTeam = competitionTeamOptions.filter((team) => team.team_name.trim().toLowerCase() === teamName);
    return { sameCompetition, sameTeam };
  }

  function getProfileName(profileId: string) {
    return allProfiles.find((profile) => profile.id === profileId)?.name || 'Unnamed Member';
  }

  function getOriginalTeam(originalResult: OriginalCompetitionResult) {
    return firstItem(originalResult.team_id);
  }

  function getOriginalCompetition(originalResult: OriginalCompetitionResult) {
    return firstItem(getOriginalTeam(originalResult)?.competition_id);
  }

  function getOriginalParticipants(originalResult: OriginalCompetitionResult) {
    const participants = getOriginalTeam(originalResult)?.competition_participants || [];
    return participants
      .map((participant) => firstItem(participant.profiles)?.name || participant.display_name)
      .filter(Boolean)
      .join(', ');
  }

  function getProposedParticipants(submission: CompetitionSubmission) {
    const submitterProfile = getSubmitterProfile(submission.submitted_by);
    const draft = submission.draft;
    const linkedNames = [
      submitterProfile?.name,
      ...(draft.internal_teammate_ids || []).map((profileId) => getProfileName(profileId)),
    ].filter(Boolean) as string[];
    const externalNames = (draft.participant_names || '')
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name && !linkedNames.some((linkedName) => linkedName.trim().toLowerCase() === name.toLowerCase()));

    return Array.from(new Set([...linkedNames, ...externalNames])).join(', ');
  }

  function getEditDiffRows(submission: CompetitionSubmission) {
    const draft = submission.draft;
    const original = draft.original_record_id ? originalRecords[draft.original_record_id] : null;
    if (!original) return [];

    const originalTeam = getOriginalTeam(original);
    const originalCompetition = getOriginalCompetition(original);
    const rows = [
      { label: 'Competition', before: originalCompetition?.name || '-', after: draft.competition_name || '-' },
      { label: 'Date', before: originalCompetition?.competition_date || '-', after: draft.competition_date || '-' },
      { label: 'TAB Link', before: originalCompetition?.tab_url || '-', after: draft.tab_url || '-' },
      { label: 'Team Name', before: originalTeam?.team_name || '-', after: draft.team_name || '-' },
      { label: 'Category', before: originalTeam?.category || '-', after: draft.category || '-' },
      { label: 'Type', before: originalTeam?.format_type || original.result_type || '-', after: draft.format_type || '-' },
      { label: 'Role', before: originalTeam?.competition_participants?.[0]?.role || '-', after: draft.role || '-' },
      { label: 'Participants', before: getOriginalParticipants(original) || '-', after: getProposedParticipants(submission) || '-' },
      { label: 'Achievement', before: original.achievement_name || '-', after: draft.achievement_name || '-' },
      { label: 'Documentation', before: original.documentation_url || '-', after: draft.documentation_url || '-' },
    ];

    return rows.map((row) => ({
      ...row,
      changed: normalizeCompareValue(row.before) !== normalizeCompareValue(row.after),
    }));
  }

  async function approveCompetitionSubmission(submission: CompetitionSubmission) {
    const draft = submission.draft;
    const selection = getReviewSelection(submission);
    const submitterProfile = getSubmitterProfile(submission.submitted_by);

    setReviewingSubmissionId(submission.id);

    if (draft.record_kind === 'join_request') {
      if (!draft.original_record_id) {
        setAttendanceMessage('Record ID tujuan join tidak ditemukan.');
        setReviewingSubmissionId(null);
        return;
      }
      
      const originalResult = originalRecords[draft.original_record_id];
      const originalTeam = originalResult ? getOriginalTeam(originalResult) : null;
      if (!originalResult || !originalTeam) {
        setAttendanceMessage('Data canonical tujuan join tidak ditemukan.');
        setReviewingSubmissionId(null);
        return;
      }

      if (!submitterProfile?.id) {
        setAttendanceMessage('Profil member yang melakukan request tidak ditemukan.');
        setReviewingSubmissionId(null);
        return;
      }

      // Check if user is already a participant of this team
      const { data: existingPart } = await supabase
        .from('competition_participants')
        .select('id')
        .eq('team_id', originalTeam.id)
        .eq('profile_id', submitterProfile.id)
        .maybeSingle();

      if (existingPart) {
        setAttendanceMessage('Member sudah terdaftar sebagai participant di record ini.');
        setReviewingSubmissionId(null);
        return;
      }

      // Insert new participant row
      const { error: insertError } = await supabase
        .from('competition_participants')
        .insert({
          team_id: originalTeam.id,
          profile_id: submitterProfile.id,
          display_name: submitterProfile.name || 'Unnamed Member',
          role: draft.role || 'Speaker',
        });

      if (insertError) {
        setAttendanceMessage(`Gagal menambah participant: ${insertError.message}`);
        setReviewingSubmissionId(null);
        return;
      }

      // Mark submission as approved
      const { error: reviewError } = await supabase
        .from('competition_submissions')
        .update({
          status: 'approved',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          review_note: selection.note || 'Join request approved.',
        })
        .eq('id', submission.id);

      if (reviewError) {
        setAttendanceMessage(`Participant berhasil ditambah, tapi status submission gagal diupdate: ${reviewError.message}`);
      } else {
        setAttendanceMessage('Join request berhasil di-approve.');
        await notifySubmissionApproved(submission, `Your join request for "${originalResult.achievement_name || draft.competition_name || 'UDF record'}" was approved.`);
      }

      setReviewingSubmissionId(null);
      await Promise.all([fetchCompetitionReviewData(), fetchAttendance()]);
      return;
    }

    if (draft.record_kind === 'delete_request') {
      if (!draft.original_record_id) {
        setAttendanceMessage('Record ID tujuan delete tidak ditemukan.');
        setReviewingSubmissionId(null);
        return;
      }

      const originalResult = originalRecords[draft.original_record_id];
      const originalTeam = originalResult ? getOriginalTeam(originalResult) : null;
      if (!originalResult || !originalTeam) {
        setAttendanceMessage('Data canonical tujuan delete tidak ditemukan.');
        setReviewingSubmissionId(null);
        return;
      }

      if (!submitterProfile?.id) {
        setAttendanceMessage('Profil member yang melakukan request tidak ditemukan.');
        setReviewingSubmissionId(null);
        return;
      }

      // Fetch all participants for this team
      const { data: participants, error: partError } = await supabase
        .from('competition_participants')
        .select('id, profile_id')
        .eq('team_id', originalTeam.id);

      if (partError || !participants) {
        setAttendanceMessage(`Gagal mengecek participants: ${partError?.message || 'Unknown error'}`);
        setReviewingSubmissionId(null);
        return;
      }

      // Check if this user is a participant
      const userParticipant = participants.find(p => p.profile_id === submitterProfile.id);
      if (!userParticipant) {
        setAttendanceMessage('Member tidak ditemukan dalam daftar participant record ini.');
        setReviewingSubmissionId(null);
        return;
      }

      let deleteMessage = '';
      if (participants.length <= 1) {
        // Only participant, delete the team (cascades to result & participant)
        const { error: deleteTeamError } = await supabase
          .from('competition_teams')
          .delete()
          .eq('id', originalTeam.id);

        if (deleteTeamError) {
          setAttendanceMessage(`Gagal menghapus team record: ${deleteTeamError.message}`);
          setReviewingSubmissionId(null);
          return;
        }
        deleteMessage = 'Seluruh record dihapus karena user adalah satu-satunya participant.';
      } else {
        // Multiple participants, only delete this participant row
        const { error: deletePartError } = await supabase
          .from('competition_participants')
          .delete()
          .eq('id', userParticipant.id);

        if (deletePartError) {
          setAttendanceMessage(`Gagal menghapus participant: ${deletePartError.message}`);
          setReviewingSubmissionId(null);
          return;
        }
        deleteMessage = 'User dihapus dari daftar participant record.';
      }

      // Mark submission as approved
      const { error: reviewError } = await supabase
        .from('competition_submissions')
        .update({
          status: 'approved',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          review_note: selection.note || `Delete request approved. ${deleteMessage}`,
        })
        .eq('id', submission.id);

      if (reviewError) {
        setAttendanceMessage(`Record berhasil didelete/diupdate, tapi status submission gagal diupdate: ${reviewError.message}`);
      } else {
        setAttendanceMessage(`Delete request berhasil di-approve. ${deleteMessage}`);
        await notifySubmissionApproved(submission, `Your delete request for "${originalResult.achievement_name || draft.competition_name || 'UDF record'}" was approved. ${deleteMessage}`);
      }

      setReviewingSubmissionId(null);
      await Promise.all([fetchCompetitionReviewData(), fetchAttendance()]);
      return;
    }

    if (!draft.competition_name || !draft.team_name) {
      setAttendanceMessage('Submission tidak lengkap: competition dan team wajib ada.');
      setReviewingSubmissionId(null);
      return;
    }

    if (draft.record_kind === 'edit_request' && draft.original_record_id) {
      const originalResult = originalRecords[draft.original_record_id];
      const originalTeam = originalResult ? getOriginalTeam(originalResult) : null;
      const originalCompetition = originalResult ? getOriginalCompetition(originalResult) : null;
      if (!originalResult || !originalTeam || !originalCompetition) {
        setAttendanceMessage('Data original tidak ditemukan atau rusak untuk edit request ini.');
        setReviewingSubmissionId(null);
        return;
      }
      
      const teamId = originalTeam.id;
      const compId = originalCompetition.id;

      // 1. Update Competition
      await supabase.from('competitions').update({
        name: draft.competition_name,
        competition_date: draft.competition_date || null,
        category: draft.category || null,
        tab_url: draft.tab_url || null,
      }).eq('id', compId);

      // 2. Update Team
      await supabase.from('competition_teams').update({
        team_name: draft.team_name,
        category: draft.category || null,
        format_type: draft.format_type || 'Debate - Team',
      }).eq('id', teamId);

      // 3. Update Result
      await supabase.from('competition_results').update({
        achievement_name: draft.is_achievement ? draft.achievement_name : 'Participation',
        result_type: draft.format_type || 'Debate - Team',
        documentation_url: draft.documentation_url || null,
        is_achievement: Boolean(draft.is_achievement),
      }).eq('id', draft.original_record_id);

      // 4. Update Participants (Wipe & Re-insert)
      const linkedProfiles = selection.linkedProfileIds
        .map((profileId) => allProfiles.find((profile) => profile.id === profileId))
        .filter((profile): profile is Profile => Boolean(profile));
      const participantNames = (draft.participant_names || '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);

      const targetParticipants = [
        ...linkedProfiles.map((profile) => ({
          team_id: teamId,
          profile_id: profile.id,
          display_name: profile.name || 'Unnamed Member',
          role: draft.role || 'Speaker',
        })),
        ...participantNames
          .filter((name) => !linkedProfiles.some((profile) => profile.name?.trim().toLowerCase() === name.toLowerCase()))
          .map((name) => ({
            team_id: teamId,
            profile_id: null as string | null,
            display_name: name,
            role: draft.role || 'Speaker',
          })),
      ];

      await supabase.from('competition_participants').delete().eq('team_id', teamId);
      if (targetParticipants.length > 0) {
        await supabase.from('competition_participants').insert(targetParticipants);
      }
      
      await supabase.from('competition_submissions').update({
        status: 'approved',
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        review_note: selection.note || 'Edit request approved into canonical records.',
      }).eq('id', submission.id);

      setAttendanceMessage('Edit request di-approve dan canonical records diupdate.');
      await Promise.all([
        notifySubmissionApproved(submission, `Your edit request for "${draft.competition_name || 'UDF record'}" was approved.`),
        notifyLinkedTeammates(submission, selection.linkedProfileIds),
      ]);
      setReviewingSubmissionId(null);
      await Promise.all([fetchCompetitionReviewData(), fetchAttendance()]);
      return;
    }

    let competitionId = selection.competitionId;
    if (!competitionId) {
      const { data, error } = await supabase
        .from('competitions')
        .insert({
          name: draft.competition_name,
          competition_date: draft.competition_date || null,
          category: draft.category || null,
          tab_url: draft.tab_url || null,
          created_by: userId,
        })
        .select('id')
        .single();

      if (error || !data) {
        setAttendanceMessage(`Gagal membuat competition: ${error?.message || 'Unknown error'}`);
        setReviewingSubmissionId(null);
        return;
      }
      competitionId = data.id;
    }

    let teamId = selection.teamId;
    if (!teamId) {
      const { data, error } = await supabase
        .from('competition_teams')
        .insert({
          competition_id: competitionId,
          team_name: draft.team_name,
          category: draft.category || null,
          format_type: draft.format_type || 'Debate - Team',
          created_by: userId,
        })
        .select('id')
        .single();

      if (error || !data) {
        setAttendanceMessage(`Gagal membuat team: ${error?.message || 'Unknown error'}`);
        setReviewingSubmissionId(null);
        return;
      }
      teamId = data.id;
    }

    const linkedProfiles = selection.linkedProfileIds
      .map((profileId) => allProfiles.find((profile) => profile.id === profileId))
      .filter((profile): profile is Profile => Boolean(profile));
    const participantNames = (draft.participant_names || submitterProfile?.name || '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    const participantRows = [
      ...linkedProfiles.map((profile) => ({
        team_id: teamId,
        profile_id: profile.id,
        display_name: profile.name || 'Unnamed Member',
        role: draft.role || 'Speaker',
      })),
      ...participantNames
        .filter((name) => !linkedProfiles.some((profile) => profile.name?.trim().toLowerCase() === name.toLowerCase()))
        .map((name) => ({
          team_id: teamId,
          profile_id: null,
          display_name: name,
          role: draft.role || 'Speaker',
        })),
    ];

    if (participantRows.length > 0) {
      const { data: existingParticipants } = await supabase
        .from('competition_participants')
        .select('profile_id, display_name')
        .eq('team_id', teamId);
      const existingKeys = new Set((existingParticipants || []).map((participant) => (
        participant.profile_id ? `profile:${participant.profile_id}` : `name:${String(participant.display_name).trim().toLowerCase()}`
      )));
      const newParticipantRows = participantRows.filter((participant) => {
        const key = participant.profile_id ? `profile:${participant.profile_id}` : `name:${participant.display_name.trim().toLowerCase()}`;
        if (existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
      });

      if (newParticipantRows.length > 0) {
        const { error } = await supabase.from('competition_participants').insert(newParticipantRows);
        if (error) setAttendanceMessage(`Participant dibuat sebagian/gagal: ${error.message}`);
      }
    }

    const { error: resultError } = await supabase.from('competition_results').insert({
      team_id: teamId,
      achievement_name: draft.is_achievement ? draft.achievement_name : 'Participation',
      result_type: draft.format_type || 'Debate - Team',
      documentation_url: draft.documentation_url || null,
      is_achievement: Boolean(draft.is_achievement),
      created_by: userId,
    });

    if (resultError) {
      setAttendanceMessage(`Gagal membuat result: ${resultError.message}`);
      setReviewingSubmissionId(null);
      return;
    }

    const { error: reviewError } = await supabase
      .from('competition_submissions')
      .update({
        status: 'approved',
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        review_note: selection.note || 'Approved into canonical competition records.',
      })
      .eq('id', submission.id);

    if (reviewError) {
      setAttendanceMessage(`Record canonical dibuat, tapi submission gagal diupdate: ${reviewError.message}`);
    } else {
      setAttendanceMessage('Submission di-approve dan masuk canonical records.');
      await Promise.all([
        notifySubmissionApproved(submission, `Your ${getSubmissionKindLabel(submission)} request for "${draft.competition_name || 'UDF record'}" was approved.`),
        notifyLinkedTeammates(submission, selection.linkedProfileIds),
      ]);
    }

    setReviewingSubmissionId(null);
    await Promise.all([fetchCompetitionReviewData(), fetchAttendance()]);
  }

  async function rejectCompetitionSubmission(submission: CompetitionSubmission) {
    if (!userId) return;
    if (!window.confirm('Apakah Anda yakin ingin me-reject submission ini?')) return;

    setReviewingSubmissionId(submission.id);
    setAttendanceMessage('Rejecting submission...');
    const note = getReviewSelection(submission).note || 'Rejected by EB/Admin.';
    const { error } = await supabase
      .from('competition_submissions')
      .update({
        status: 'rejected',
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        review_note: note,
      })
      .eq('id', submission.id);

    if (error) {
      setAttendanceMessage(`Gagal reject submission: ${error.message}`);
    } else {
      // Send notification to submitter
      const recordKindLabel = submission.draft.record_kind === 'edit_request' 
        ? 'edit' 
        : submission.draft.record_kind === 'join_request' 
        ? 'join' 
        : submission.draft.record_kind === 'delete_request' 
        ? 'delete' 
        : 'add';
        
      const { error: notificationError } = await supabase.from('notifications').insert({
        user_id: submission.submitted_by,
        title: 'Request Rejected',
        message: `Your request to ${recordKindLabel} record for "${submission.draft.competition_name || 'Competition'}" was rejected. Reason: ${note}`,
        link: '/my-profile',
        type: 'achievement',
        priority: 'high',
        action_required: true,
      });
      
      if (notificationError) {
        console.error('Failed to create rejection notification:', notificationError);
      }
      
      setAttendanceMessage('Submission ditolak dengan review note dan notifikasi dikirim.');
    }

    setReviewingSubmissionId(null);
    await fetchCompetitionReviewData();
  }
  async function ensureAttendanceSession(weekly: WeeklySession) {
    const existingSession = attendanceSessionByWeeklyId.get(weekly.id);
    if (existingSession) return existingSession;

    const { data, error } = await supabase
      .from('attendance_sessions')
      .insert({
        title: weekly.title,
        weekly_session_id: weekly.id,
        created_by: userId,
        expires_at: new Date(new Date(weekly.scheduled_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id, title, created_at, weekly_session_id')
      .single();

    if (error || !data) {
      setAttendanceMessage(`Gagal membuat sesi presensi: ${error?.message || 'Unknown error'}`);
      return null;
    }

    const nextSession = data as AttendanceSession;
    setAttendanceSessions((current) => [...current, nextSession]);
    return nextSession;
  }

  async function updateAttendanceStatus(memberId: string, sessionId: string, nextStatus: AttendanceStatus) {
    setAttendanceMessage('');
    if (!memberId || !sessionId) return;
    const existingRecord = attendanceRecords.find((record) => record.user_id === memberId && record.session_id === sessionId);

    const response = existingRecord
      ? await supabase.from('attendance_records').update({ status: nextStatus }).eq('id', existingRecord.id)
      : await supabase.from('attendance_records').insert({ user_id: memberId, session_id: sessionId, status: nextStatus });

    if (response.error) {
      setAttendanceMessage(`Gagal update presensi: ${response.error.message}`);
      return;
    }

    const session = attendanceSessions.find((item) => item.id === sessionId);
    await notifyUser({
      userId: memberId,
      title: 'Attendance Updated',
      message: `Status presensi kamu untuk "${session?.title || 'weekly training'}" menjadi ${nextStatus}.`,
      link: '/presensi',
      type: 'attendance',
    });
    await fetchAttendance();
  }

  async function updateWeeklyAttendanceStatus(memberId: string, weekly: WeeklySession, nextStatus: AttendanceStatus | '') {
    if (!memberId || !nextStatus) return;
    if (weekly.is_locked) {
      setAttendanceMessage('Presensi weekly ini sedang dikunci.');
      return;
    }

    const session = await ensureAttendanceSession(weekly);
    if (!session) return;
    await updateAttendanceStatus(memberId, session.id, nextStatus);
  }

  async function createWeeklySession() {
    if (!userId || !newWeeklyTitle || !newWeeklyDate) return;
    const title = newWeeklyTitle;
    const scheduledAt = new Date(newWeeklyDate).toISOString();
    await supabase.from('weekly_sessions').insert({
      title: newWeeklyTitle,
      scheduled_at: scheduledAt,
      notes: newWeeklyNotes || null,
      created_by: userId,
    });
    await notifyApprovedMembers({
      title: 'Weekly Training Scheduled',
      message: `${title} dijadwalkan pada ${new Date(scheduledAt).toLocaleString('id-ID')}.`,
      link: '/presensi',
      type: 'training',
    });
    setNewWeeklyTitle(''); setNewWeeklyDate(''); setNewWeeklyNotes('');
    await fetchAttendance();
  }

  async function updateWeeklySession(weeklyId: string, payload: Partial<WeeklySession>) {
    await supabase.from('weekly_sessions').update(payload).eq('id', weeklyId);
    const currentWeekly = weeklySessions.find((weekly) => weekly.id === weeklyId);
    if (payload.scheduled_at || payload.title) {
      await notifyApprovedMembers({
        title: 'Training Schedule Updated',
        message: `${payload.title || currentWeekly?.title || 'Weekly training'} punya update jadwal/detail terbaru.`,
        link: '/presensi',
        type: 'training',
        priority: 'high',
      });
    }
    await fetchAttendance();
  }

  function startWeeklyEdit(weekly: WeeklySession) {
    setEditingWeeklyId(weekly.id);
    setWeeklyDraft({
      title: weekly.title,
      scheduled_at: toDateTimeLocal(weekly.scheduled_at),
      notes: weekly.notes || '',
    });
  }

  function cancelWeeklyEdit() {
    setEditingWeeklyId(null);
    setWeeklyDraft({ title: '', scheduled_at: '', notes: '' });
  }

  async function saveWeeklyEdit(weeklyId: string) {
    if (!weeklyDraft.title || !weeklyDraft.scheduled_at) return;
    await updateWeeklySession(weeklyId, {
      title: weeklyDraft.title,
      scheduled_at: new Date(weeklyDraft.scheduled_at).toISOString(),
      notes: weeklyDraft.notes || null,
    });
    cancelWeeklyEdit();
  }

  async function toggleWeeklyLock(weekly: WeeklySession) {
    await updateWeeklySession(weekly.id, { is_locked: !weekly.is_locked });
    setAttendanceMessage(!weekly.is_locked ? 'Presensi weekly dikunci.' : 'Presensi weekly dibuka lagi.');
    await notifyApprovedMembers({
      title: !weekly.is_locked ? 'Attendance Locked' : 'Attendance Reopened',
      message: `Presensi untuk "${weekly.title}" ${!weekly.is_locked ? 'sudah dikunci oleh EB.' : 'dibuka kembali.'}`,
      link: '/presensi',
      type: 'attendance',
      priority: !weekly.is_locked ? 'high' : 'normal',
    });
  }

  async function deleteWeeklySession(weeklyId: string) {
    await supabase.from('weekly_sessions').delete().eq('id', weeklyId);
    await fetchAttendance();
  }

  const attendanceByMemberAndSession = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach((record) => map.set(`${record.user_id}:${record.session_id}`, record));
    return map;
  }, [attendanceRecords]);

  const attendanceSessionByWeeklyId = useMemo(() => {
    const map = new Map<string, AttendanceSession>();
    attendanceSessions.forEach((session) => { if (session.weekly_session_id) map.set(session.weekly_session_id, session); });
    return map;
  }, [attendanceSessions]);

  const attendanceSummary = useMemo(() => {
    const present = attendanceRecords.filter((record) => record.status === 'Present').length;
    const excused = attendanceRecords.filter((record) => record.status === 'Excused').length;
    const absent = attendanceRecords.filter((record) => record.status === 'Absent').length;
    const total = Math.max(allProfiles.length * weeklySessions.length, attendanceRecords.length);
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, excused, absent, total, rate };
  }, [allProfiles.length, attendanceRecords, weeklySessions.length]);

  const selectedHistoryMember = allProfiles.find((profile) => profile.id === selectedMemberHistoryId) || allProfiles[0];
  const selectedHistoryMemberId = selectedHistoryMember?.user_id || '';

  function getAttendanceValue(memberUserId: string | undefined, weekly: WeeklySession) {
    const session = attendanceSessionByWeeklyId.get(weekly.id);
    if (!memberUserId || !session) return '';
    return attendanceByMemberAndSession.get(`${memberUserId}:${session.id}`)?.status || '';
  }

  function buildAttendanceRows() {
    return allProfiles.map((member) => [
      member.name || 'Unnamed Member',
      ...(weeklySessions.map((weekly) => statusLabel(getAttendanceValue(member.user_id, weekly)))),
    ]);
  }

  function downloadFile(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportAttendanceCsv() {
    const headers = ['Member', ...weeklySessions.map((weekly) => `${weekly.title} (${new Date(weekly.scheduled_at).toLocaleDateString()})`)];
    const rows = [headers, ...buildAttendanceRows()];
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    downloadFile(`udf-attendance-${selectedMonth}.csv`, csv, 'text/csv;charset=utf-8');
  }

  function exportAttendanceExcel() {
    const headers = ['Member', ...weeklySessions.map((weekly) => `${weekly.title} (${new Date(weekly.scheduled_at).toLocaleDateString()})`)];
    const rows = buildAttendanceRows();
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
    downloadFile(`udf-attendance-${selectedMonth}.xls`, html, 'application/vnd.ms-excel;charset=utf-8');
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

  const selectedRole = roleOptions.find(r => r.id === selectedRoleId);
  const membersWithSelectedRole = allProfiles.filter(p => p.discord_roles?.some(r => r.id === selectedRoleId || r.name === selectedRole?.name));
  const pendingProfiles = allProfiles.filter((profile) => profile.approval_status !== 'approved');

  return (
    <section className="section active-section" style={{ display: 'block' }}>
      <div className={styles.pageHeader}>
        <div>
          <p className="eyebrow">EB Area</p>
          <h2>Operations Dashboard</h2>
        </div>
        <div className="segmented" role="group">
          <button className={`segment ${activeAreaTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveAreaTab('attendance')}>Attendance</button>
          <button className={`segment ${activeAreaTab === 'registrations' ? 'active' : ''}`} onClick={() => setActiveAreaTab('registrations')}>Registrations ({pendingProfiles.length})</button>
          <button className={`segment ${activeAreaTab === 'competitionReview' ? 'active' : ''}`} onClick={() => setActiveAreaTab('competitionReview')}>Competition Review ({competitionSubmissions.filter((item) => item.status === 'pending').length})</button>
          <button className={`segment ${activeAreaTab === 'roles' ? 'active' : ''}`} onClick={() => setActiveAreaTab('roles')}>Role Management</button>
          {isAdmin && (
            <button className={`segment ${activeAreaTab === 'authority' ? 'active' : ''}`} onClick={() => setActiveAreaTab('authority')}>User Authority</button>
          )}
        </div>
      </div>

      {attendanceMessage && <div className={styles.notice}>{attendanceMessage}</div>}

      {activeAreaTab === 'registrations' && (
        <article className="panel" style={{ marginTop: '16px' }}>
          <div className="panel-header">
            <div>
              <h3>Registration Approval</h3>
              <p className={styles.subtle}>Review calon akun sebelum mereka mendapat akses penuh ke Debate Mate.</p>
            </div>
          </div>
          <div className={styles.attendanceTableWrap}>
            <table className={styles.attendanceTable}>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Status</th>
                  <th>Batch / Type</th>
                  <th>Experience</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {pendingProfiles.map((profile) => (
                  <tr key={profile.id}>
                    <td>
                      <div className={styles.memberCell}>
                        <span>{getInitials(profile.name)}</span>
                        <div>
                          <strong>{profile.name || 'Unnamed User'}</strong>
                          <small>{profile.caption || profile.user_id?.slice(0, 8)}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="rank-badge">{profile.approval_status || 'pending_approval'}</span>
                      {profile.rejection_reason && <small style={{ display: 'block', marginTop: 6, color: '#bf616a' }}>{profile.rejection_reason}</small>}
                    </td>
                    <td>{profile.batch || '-'} / {profile.member_type || 'newbie'}</td>
                    <td style={{ minWidth: 220 }}>{profile.debating_experience || '-'}</td>
                    <td>
                      <div style={{ display: 'grid', gap: '8px', minWidth: 220 }}>
                        <input
                          className="input"
                          value={rejectionReasons[profile.id!] || ''}
                          onChange={(event) => setRejectionReasons((current) => ({ ...current, [profile.id!]: event.target.value }))}
                          placeholder="Reject reason"
                        />
                        <button className="primary-button" type="button" onClick={() => approveProfile(profile.id!)}>
                          Approve
                        </button>
                        <button className="ghost-button" type="button" onClick={() => rejectProfile(profile.id!)}>
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingProfiles.length === 0 && (
                  <tr>
                    <td colSpan={5}>Tidak ada akun yang menunggu approval.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {activeAreaTab === 'competitionReview' && (
        <article className="panel" style={{ marginTop: '16px' }}>
          <div className="panel-header">
            <div>
              <h3>Competition Submission Review</h3>
              <p className={styles.subtle}>Approve member submissions into canonical competition, team, participant, and result records.</p>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '14px' }}>
            {competitionSubmissions.filter((submission) => submission.status === 'pending').map((submission) => {
              const selection = getReviewSelection(submission);
              const draft = submission.draft;
              const submitter = getSubmitterProfile(submission.submitted_by);
              const duplicateHints = findDuplicateHints(submission);
              const teamsForSelectedCompetition = competitionTeamOptions.filter((team) => !selection.competitionId || team.competition_id === selection.competitionId);
              const editDiffRows = getEditDiffRows(submission);

              return (
                <div key={submission.id} className={styles.recordForm} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 14 }}>
                  <div className={styles.fullSpan}>
                    <strong>
                      {draft.record_kind === 'edit_request' 
                        ? '✏️ Edit Request' 
                        : draft.record_kind === 'join_request' 
                        ? '🔗 Join Request' 
                        : draft.record_kind === 'delete_request' 
                        ? '❌ Delete Request' 
                        : draft.is_achievement 
                        ? '🏆 Achievement Claim' 
                        : '📋 Debate History'}
                      : {draft.achievement_name || draft.competition_name}
                    </strong>
                    <p className={styles.subtle}>
                      Submitted by {submitter?.name || submission.submitted_by.slice(0, 8)} / {draft.competition_name} / {draft.team_name}
                    </p>
                    
                    {draft.record_kind === 'edit_request' && editDiffRows.length > 0 && (
                      <div style={{ marginTop: 12, padding: 12, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 6 }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Original Record vs Proposed Changes</p>
                        <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ color: 'var(--muted)', textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                              <th style={{ padding: '4px 0', width: 130 }}>Field</th>
                              <th style={{ padding: '4px 0' }}>Current</th>
                              <th style={{ padding: '4px 0' }}>Submitted Change</th>
                            </tr>
                          </thead>
                          <tbody>
                            {editDiffRows.map((row) => (
                              <tr key={row.label} style={{ borderBottom: '1px solid var(--line)', background: row.changed ? 'rgba(163, 190, 140, 0.12)' : 'transparent' }}>
                                <td style={{ padding: '6px 0', color: 'var(--muted)', fontWeight: 800 }}>{row.label}</td>
                                <td style={{ padding: '6px 8px 6px 0', textDecoration: row.changed ? 'line-through' : 'none', color: row.changed ? 'var(--muted)' : 'inherit', wordBreak: 'break-word' }}>{row.before}</td>
                                <td style={{ padding: '6px 0', color: row.changed ? 'var(--green)' : 'inherit', fontWeight: row.changed ? 800 : 400, wordBreak: 'break-word' }}>{row.after}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    {draft.record_kind === 'join_request' && (
                      <div style={{ marginTop: 12, padding: 12, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 6 }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Join Request Details</p>
                        <p style={{ fontSize: '0.9rem', marginBottom: 6 }}>
                          <strong>{submitter?.name}</strong> wants to join as <strong>{draft.role || 'Speaker'}</strong> on:
                        </p>
                        {draft.original_record_id && originalRecords[draft.original_record_id] && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', paddingLeft: 8, borderLeft: '2px solid var(--line)' }}>
                            <p><strong>Competition:</strong> {getOriginalCompetition(originalRecords[draft.original_record_id])?.name || '-'}</p>
                            <p><strong>Team:</strong> {getOriginalTeam(originalRecords[draft.original_record_id])?.team_name || '-'}</p>
                            <p><strong>Current Teammates:</strong> {getOriginalParticipants(originalRecords[draft.original_record_id]) || 'None'}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {draft.record_kind === 'delete_request' && (
                      <div style={{ marginTop: 12, padding: 12, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 6 }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#bf616a', textTransform: 'uppercase', marginBottom: 8 }}>Delete Request Details</p>
                        <p style={{ fontSize: '0.9rem', marginBottom: 6 }}>
                          <strong>{submitter?.name}</strong> requests to delete their entry from:
                        </p>
                        {draft.original_record_id && originalRecords[draft.original_record_id] && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', paddingLeft: 8, borderLeft: '2px solid var(--line)' }}>
                            <p><strong>Competition:</strong> {getOriginalCompetition(originalRecords[draft.original_record_id])?.name || '-'}</p>
                            <p><strong>Team:</strong> {getOriginalTeam(originalRecords[draft.original_record_id])?.team_name || '-'}</p>
                            <p><strong>Other Teammates:</strong> {getOriginalParticipants(originalRecords[draft.original_record_id]) || 'None'}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {draft.record_kind === 'edit_request' && editDiffRows.length === 0 && (
                      <p style={{ color: '#9f4f33', fontWeight: 800 }}>
                        Original record belum ditemukan. Minta member resubmit edit request dari record terbaru.
                      </p>
                    )}
                    {draft.record_kind === 'edit_request' && editDiffRows.length > 0 && (
                      <p className={styles.subtle} style={{ marginTop: 8 }}>
                        Edit request akan mengupdate canonical record yang sudah ada. Tidak perlu pilih/create competition atau team baru.
                      </p>
                    )}

                    {draft.record_kind !== 'edit_request' && draft.record_kind !== 'join_request' && draft.record_kind !== 'delete_request' && (duplicateHints.sameCompetition.length > 0 || duplicateHints.sameTeam.length > 0) && (
                      <p style={{ color: '#9f4f33', fontWeight: 800 }}>
                        Possible duplicate: {duplicateHints.sameCompetition.length} competition match, {duplicateHints.sameTeam.length} team match.
                      </p>
                    )}
                  </div>

                  {draft.record_kind !== 'edit_request' && draft.record_kind !== 'join_request' && draft.record_kind !== 'delete_request' && (
                    <>
                      <label>Existing Competition
                        <select
                          className="input"
                          value={selection.competitionId}
                          onChange={(event) => setReviewSelection(submission.id, { competitionId: event.target.value, teamId: '' })}
                        >
                          <option value="">Create new: {draft.competition_name}</option>
                          {competitionOptions.map((competition) => (
                            <option key={competition.id} value={competition.id}>{competition.name} {competition.competition_date ? `(${competition.competition_date})` : ''}</option>
                          ))}
                        </select>
                      </label>

                      <label>Existing Team
                        <select
                          className="input"
                          value={selection.teamId}
                          onChange={(event) => setReviewSelection(submission.id, { teamId: event.target.value })}
                        >
                          <option value="">Create new: {draft.team_name}</option>
                          {teamsForSelectedCompetition.map((team) => (
                            <option key={team.id} value={team.id}>{team.team_name} / {team.category || 'Open'} / {team.format_type || 'Debate'}</option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}

                  {draft.record_kind !== 'edit_request' && draft.record_kind !== 'join_request' && draft.record_kind !== 'delete_request' && (
                    <div className={styles.fullSpan}>
                      <label>Linked Member Profiles</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        {allProfiles.map((profile) => {
                          const checked = selection.linkedProfileIds.includes(profile.id!);
                          return (
                            <label key={profile.id} className="rank-badge" style={{ cursor: 'pointer', gap: 6 }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => {
                                  const nextIds = event.target.checked
                                    ? Array.from(new Set([...selection.linkedProfileIds, profile.id!]))
                                    : selection.linkedProfileIds.filter((profileId) => profileId !== profile.id);
                                  setReviewSelection(submission.id, { linkedProfileIds: nextIds });
                                }}
                              />
                              {profile.name || 'Unnamed'}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <label className={styles.fullSpan}>Review Note
                    <textarea
                      className="input"
                      value={selection.note}
                      onChange={(event) => setReviewSelection(submission.id, { note: event.target.value })}
                      placeholder="Catatan untuk member, terutama kalau reject atau ada konteks approval."
                      rows={2}
                    />
                  </label>

                  <div className={styles.fullSpan} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="primary-button" type="button" disabled={reviewingSubmissionId === submission.id} onClick={() => approveCompetitionSubmission(submission)}>
                      {reviewingSubmissionId === submission.id ? 'Approving...' : 'Approve to Canonical Records'}
                    </button>
                    <button className="ghost-button" type="button" disabled={reviewingSubmissionId === submission.id} onClick={() => rejectCompetitionSubmission(submission)}>
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
            {competitionSubmissions.filter((submission) => submission.status === 'pending').length === 0 && (
              <p className={styles.emptyState}>Tidak ada competition submission yang pending.</p>
            )}
          </div>
        </article>
      )}

      {activeAreaTab === 'authority' && isAdmin && (
        <article className="panel" style={{ marginTop: '16px' }}>
          <div className="panel-header">
            <div>
              <h3>User Authority Management</h3>
              <p className={styles.subtle}>Ubah tingkat akses system_role (member, eb, admin). HANYA UNTUK ADMIN.</p>
            </div>
          </div>
          <div className={styles.attendanceTableWrap}>
            <table className={styles.attendanceTable}>
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Email / ID</th>
                  <th>Current System Role</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {allProfiles.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className={styles.memberCell}>
                        <span>{getInitials(p.name)}</span>
                        <div><strong>{p.name || 'Unnamed User'}</strong></div>
                      </div>
                    </td>
                    <td>{p.user_id?.substring(0, 8)}...</td>
                    <td>
                      <span className={`rank-badge`} style={{ 
                        background: p.system_role === 'admin' ? '#bf616a22' : p.system_role === 'eb' ? '#d0877022' : '#81a1c122',
                        color: p.system_role === 'admin' ? '#bf616a' : p.system_role === 'eb' ? '#d08770' : '#81a1c1',
                        borderColor: 'transparent'
                      }}>
                        {p.system_role || 'member'}
                      </span>
                    </td>
                    <td>
                      <select 
                        className="input" 
                        style={{ padding: '4px 8px', height: 'auto', minHeight: '32px' }}
                        value={p.system_role || 'member'}
                        onChange={(e) => updateUserSystemRole(p.id!, e.target.value)}
                        disabled={p.user_id === userId} // Prevent admin from changing their own role to avoid getting locked out
                      >
                        <option value="member">Member</option>
                        <option value="eb">EB</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {activeAreaTab === 'roles' && (
        <article className="panel" style={{ padding: 0 }}>
          <div className={styles.discordRoleContainer}>
            <div className={styles.discordRoleSidebar}>
              <div className={styles.discordRoleSidebarHeader}>
                <span>Roles</span>
                <span>{roleOptions.length}</span>
              </div>
              <div className={styles.discordRoleList}>
                {roleOptions.map(role => (
                  <button 
                    key={role.id} 
                    className={styles.discordRoleItem} 
                    data-active={selectedRoleId === role.id}
                    onClick={() => selectRole(role)}
                    type="button"
                  >
                    <div className={styles.discordRoleIcon} style={{ background: role.color }}></div>
                    {role.name}
                  </button>
                ))}
              </div>
              <div className={styles.discordRoleCreate}>
                <input 
                  className={styles.discordInput} 
                  placeholder="New Role Name" 
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createDiscordRole()}
                />
                <button className={styles.discordButton} type="button" onClick={createDiscordRole}>Add Role</button>
              </div>
            </div>

            <div className={styles.discordRoleMain}>
              {selectedRole ? (
                <>
                  <h3 className={styles.discordRoleTitle}>
                    EDIT ROLE - {selectedRole.name}
                  </h3>
                  
                  <div className={styles.discordRoleTabs}>
                    <button className={styles.discordRoleTab} data-active={roleEditTab === 'display'} onClick={() => setRoleEditTab('display')}>Display</button>
                    <button className={styles.discordRoleTab} data-active={roleEditTab === 'permissions'} onClick={() => setRoleEditTab('permissions')}>Permissions</button>
                    <button className={styles.discordRoleTab} data-active={roleEditTab === 'members'} onClick={() => setRoleEditTab('members')}>Manage Members ({membersWithSelectedRole.length})</button>
                  </div>

                  {roleEditTab === 'display' && (
                    <div>
                      <div className={styles.discordInputGroup}>
                        <label>Role Name *</label>
                        <input className={styles.discordInput} value={editingRoleName} onChange={(e) => setEditingRoleName(e.target.value)} />
                      </div>
                      
                      <div className={styles.discordInputGroup}>
                        <label>Role Color *</label>
                        <p className={styles.discordHelpText}>Members use the color of the highest role they have on the roles list.</p>
                        <div className={styles.discordColorPicker}>
                          <label className={styles.discordCustomColor} style={{ background: editingRoleColor }} aria-label="Choose custom role color">
                            <input type="color" value={editingRoleColor} onChange={(e) => setEditingRoleColor(e.target.value)} />
                          </label>
                          <div className={styles.discordColorGrid}>
                            {ROLE_COLOR_PALETTE.map(c => (
                              <button
                                key={c}
                                className={styles.discordColorBox}
                                style={{ background: c }}
                                data-selected={editingRoleColor.toLowerCase() === c}
                                onClick={() => setEditingRoleColor(c)}
                                type="button"
                                aria-label={`Use role color ${c}`}
                              ></button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className={styles.discordActionRow}>
                        <button className={styles.discordButton} type="button" onClick={saveRoleDisplay}>Save Changes</button>
                        <button className={styles.discordButtonDanger} type="button" onClick={deleteDiscordRole}>Delete Role</button>
                      </div>
                    </div>
                  )}

                  {roleEditTab === 'permissions' && (
                    <div>
                      <div className={styles.discordInputGroup}>
                        <label>Assignment Permissions</label>
                        <p className={styles.discordPermissionCopy}>
                          Hierarki ditetapkan melalui nama role. <br/><br/>
                          - <strong>ADMIN</strong> dan <strong>EB</strong> hanya dapat di-assign oleh Admin.<br/>
                          - <strong>UDF*</strong>, <strong>Members</strong>, <strong>Coach</strong> hanya dapat di-assign oleh Admin atau EB.<br/>
                          - Role lain (Open, Novice, dll) dapat di-assign oleh siapa saja di menu profil mereka.
                        </p>
                      </div>
                    </div>
                  )}

                  {roleEditTab === 'members' && (
                    <div>
                      <div className={`${styles.discordInputGroup} ${styles.discordMemberAddRow}`}>
                        <select className={styles.discordInput} value={memberToAdd} onChange={(e) => setMemberToAdd(e.target.value)}>
                          <option value="">Select Member to Add...</option>
                          {allProfiles.filter(p => !membersWithSelectedRole.find(m => m.id === p.id)).map(p => (
                            <option key={p.id} value={p.id}>{p.name || 'Unnamed'}</option>
                          ))}
                        </select>
                        <button className={styles.discordButton} type="button" onClick={assignRoleToMember}>Add</button>
                      </div>

                      <div className={styles.discordMemberList}>
                        {membersWithSelectedRole.map(member => (
                          <div key={member.id} className={styles.discordMemberRow}>
                            <div className={styles.discordMemberInfo}>
                              {member.profile_picture_url ? (
                                <img src={member.profile_picture_url} className={styles.discordMemberAvatar} alt="" />
                              ) : (
                                <div className={styles.discordMemberAvatar} style={{ background: '#5865F2', display: 'grid', placeItems: 'center', color: 'white', fontWeight: 'bold' }}>
                                  {(member.name || 'U')[0].toUpperCase()}
                                </div>
                              )}
                              <div>
                                <strong>{member.name || 'Unnamed Member'}</strong>
                              </div>
                            </div>
                            <button className={styles.discordButtonDangerSmall} type="button" onClick={() => removeRoleFromMember(member.id!)}>Remove</button>
                          </div>
                        ))}
                        {membersWithSelectedRole.length === 0 && (
                          <p className={styles.discordEmptyState}>No members have this role yet.</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#949ba4' }}>
                  Select a role from the sidebar to edit it.
                </div>
              )}
            </div>
          </div>
        </article>
      )}

      {activeAreaTab === 'attendance' && (
        <>
          <div className={styles.statsGrid}>
            {/* Stats logic remains exactly the same */}
            <article className="metric-card"><p>Attendance rate</p><strong>{attendanceSummary.rate}%</strong><span>{selectedMonth}</span></article>
            <article className="metric-card"><p>Hadir</p><strong>{attendanceSummary.present}</strong><span>total records</span></article>
            <article className="metric-card"><p>Izin</p><strong>{attendanceSummary.excused}</strong><span>approved absences</span></article>
            <article className="metric-card"><p>Tidak hadir</p><strong>{attendanceSummary.absent}</strong><span>marked absences</span></article>
          </div>

          <article className="panel" style={{ marginTop: '16px' }}>
            <div className="panel-header">
              <div><h3>Weekly Training Planner</h3><p className={styles.subtle}>Kelola jadwal weekly, lock presensi.</p></div>
              <input className={`input ${styles.monthInput}`} type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
            </div>
            {/* Weekly Planner UI (Same as before) */}
            <div className={styles.weeklyCreateGrid}>
              <input className="input" placeholder="Judul weekly" value={newWeeklyTitle} onChange={(e) => setNewWeeklyTitle(e.target.value)} />
              <input className="input" type="datetime-local" value={newWeeklyDate} onChange={(e) => setNewWeeklyDate(e.target.value)} />
              <input className="input" placeholder="Catatan (opsional)" value={newWeeklyNotes} onChange={(e) => setNewWeeklyNotes(e.target.value)} />
              <button className="primary-button" type="button" onClick={createWeeklySession}>Tambah Weekly</button>
            </div>
            {weeklySessions.length === 0 ? <p className={styles.emptyState}>Belum ada weekly untuk bulan ini.</p> : (
              <div className={styles.weeklyList}>
                {weeklySessions.map((w) => (
                  <div key={w.id} className={styles.weeklyItem}>
                    {editingWeeklyId === w.id ? (
                      <>
                        <div className={styles.weeklyEditor}>
                          <input className="input" value={weeklyDraft.title} onChange={(e) => setWeeklyDraft({ ...weeklyDraft, title: e.target.value })} />
                          <input className="input" type="datetime-local" value={weeklyDraft.scheduled_at} onChange={(e) => setWeeklyDraft({ ...weeklyDraft, scheduled_at: e.target.value })} />
                          <input className="input" placeholder="Catatan" value={weeklyDraft.notes} onChange={(e) => setWeeklyDraft({ ...weeklyDraft, notes: e.target.value })} />
                        </div>
                        <div className={styles.weeklyActions}>
                          <button className="primary-button" type="button" onClick={() => saveWeeklyEdit(w.id)}>Simpan</button>
                          <button className="ghost-button" type="button" onClick={cancelWeeklyEdit}>Batal</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <strong>{w.title}</strong>
                          <p>{new Date(w.scheduled_at).toLocaleString()}</p>
                          {w.notes && <small>{w.notes}</small>}
                        </div>
                        <div className={styles.weeklyActions}>
                          <label className={styles.lockToggle}>
                            <input type="checkbox" checked={w.is_locked} onChange={() => toggleWeeklyLock(w)} />
                            {w.is_locked ? 'Locked' : 'Open'}
                          </label>
                          <button className="secondary-button" type="button" onClick={() => startWeeklyEdit(w)}>Edit</button>
                          <button className="ghost-button" type="button" onClick={() => deleteWeeklySession(w.id)}>Hapus</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </article>
          
          <article className="panel" style={{ marginTop: '16px' }}>
            <div className="panel-header">
              <div>
                <h3>UDF Attendance Tracker</h3>
                <p className={styles.subtle}>Edit presensi per weekly, lihat history member, atau export rekap.</p>
              </div>
              <div className={styles.trackerControls}>
                <div className="segmented" role="group" aria-label="Attendance view">
                  <button className={`segment ${attendanceViewMode === 'matrix' ? 'active' : ''}`} type="button" onClick={() => setAttendanceViewMode('matrix')}>Matrix</button>
                  <button className={`segment ${attendanceViewMode === 'history' ? 'active' : ''}`} type="button" onClick={() => setAttendanceViewMode('history')}>Member</button>
                </div>
                <button className="secondary-button" type="button" onClick={exportAttendanceCsv}>CSV</button>
                <button className="secondary-button" type="button" onClick={exportAttendanceExcel}>Excel</button>
              </div>
            </div>
            {attendanceViewMode === 'matrix' && (
              <div className={styles.attendanceTableWrap}>
                <table className={styles.attendanceTable}>
                  <thead>
                    <tr>
                      <th>Member</th>
                      {weeklySessions.map((w) => (
                        <th key={w.id}>
                          <span>{w.title}</span>
                          <small>{w.is_locked ? 'Locked' : new Date(w.scheduled_at).toLocaleDateString()}</small>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allProfiles.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <div className={styles.memberCell}>
                            <span>{getInitials(m.name)}</span>
                            <div>
                              <strong>{m.name || 'Unnamed Member'}</strong>
                              <small>{m.caption || m.system_role || 'Member'}</small>
                            </div>
                          </div>
                        </td>
                        {weeklySessions.map((w) => {
                          const value = getAttendanceValue(m.user_id, w);
                          return (
                            <td key={w.id}>
                              <select
                                className={styles.statusSelect}
                                value={value}
                                disabled={w.is_locked}
                                onChange={(e) => updateWeeklyAttendanceStatus(m.user_id!, w, e.target.value as AttendanceStatus | '')}
                              >
                                <option value="">Belum ada</option>
                                {ATTENDANCE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                              {w.is_locked && <span className={styles.cellHint}>Dikunci</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {attendanceViewMode === 'history' && (
              <div>
                <div className={styles.historyControls}>
                  <select
                    className={`input ${styles.memberFilter}`}
                    value={selectedHistoryMember?.id || ''}
                    onChange={(e) => setSelectedMemberHistoryId(e.target.value)}
                  >
                    {allProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>{profile.name || 'Unnamed Member'}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.memberTimeline}>
                  {weeklySessions.map((weekly) => {
                    const value = getAttendanceValue(selectedHistoryMemberId, weekly);
                    return (
                      <div key={weekly.id} className={styles.timelineItem}>
                        <span className={styles.timelineDot} data-status={value || undefined}></span>
                        <div>
                          <strong>{weekly.title}</strong>
                          <p>{new Date(weekly.scheduled_at).toLocaleString()}</p>
                        </div>
                        <span className={styles.statusPill} data-status={value || undefined}>{statusLabel(value)}</span>
                      </div>
                    );
                  })}
                  {weeklySessions.length === 0 && <p className={styles.emptyState}>Belum ada weekly untuk bulan ini.</p>}
                </div>
              </div>
            )}
          </article>
        </>
      )}
    </section>
  );
}
