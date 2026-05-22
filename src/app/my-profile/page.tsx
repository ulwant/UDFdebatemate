'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { notifyCurrentUser, notifyEbAdmins } from '@/lib/notifications';
import styles from './MyProfile.module.css';
import AccountSettings from './AccountSettings';

// ── Image resize utility ──────────────────────────────────────────────────────
async function resizeImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        } else {
          if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(new Error('Failed to create blob')); }, 'image/jpeg', quality);
        } else reject(new Error('Failed to get canvas context'));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ── Constants & Types ─────────────────────────────────────────────────────────
const PREDEFINED_ROLES: DiscordRole[] = [
  { name: 'Novice', color: '#a3be8c' },
  { name: 'Open', color: '#b48ead' },
  { name: 'Newbie', color: '#8fbcbb' },
  { name: 'UDF24', color: '#81a1c1' },
  { name: 'UDF25', color: '#5e81ac' },
  { name: 'Varsity', color: '#d08770' },
  { name: 'Coach', color: '#ebcb8b' },
  { name: 'EB', color: '#bf616a' },
  { name: 'Admin', color: '#d08770' },
];
const RESTRICTED_ROLES = ['admin', 'eb', 'udf24', 'udf23', 'udf25', 'members', 'coach', 'mentor'];

type DiscordRole = { id?: string; name: string; color: string };
type Achievement = { id?: string; name: string; competition: string; date: string; type: string; participant: string; category: string; documentation: string; tab_url: string };
type Profile = {
  id?: string; user_id?: string; name: string; bio: string; caption: string;
  profile_picture_url: string; header_picture_url?: string; avatar_initials?: string;
  avatar_color: string; system_role?: string; approval_status?: string; batch?: string; member_type?: string; debating_experience?: string;
  rejection_reason?: string; discord_roles: DiscordRole[];
  contact_links: { whatsapp?: string; website?: string }; achievements: Achievement[]; debating_history: unknown[];
};
type Motion = { id: string; competition?: string | null; year?: string | number | null; text: string; motion_type?: string | null; tab_url?: string | null };
type BookmarkRow = { motions: Motion | Motion[] | null };
type SubmissionStatus = 'pending' | 'approved' | 'rejected';
type CompetitionSubmission = {
  id: string;
  status: SubmissionStatus;
  draft: CompetitionSubmissionDraft;
  review_note?: string | null;
  created_at: string;
};
type CompetitionSubmissionDraft = {
  record_kind: 'history' | 'achievement' | 'edit_request' | 'join_request' | 'delete_request';
  original_record_id?: string;
  competition_name: string;
  competition_date: string;
  tab_url: string;
  team_name: string;
  participant_names: string;
  internal_teammate_ids?: string[];
  role: string;
  category: string;
  format_type: string;
  achievement_name: string;
  documentation_url: string;
  is_achievement: boolean;
};
type CompetitionHistoryRow = {
  id: string;
  competitionName: string;
  competitionDate?: string | null;
  tabUrl?: string | null;
  teamName: string;
  participantNames: string[];
  participantProfileIds: string[];
  role?: string | null;
  category: string;
  formatType: string;
  achievements: Array<{
    id: string;
    achievementName: string;
    resultType: string;
    documentationUrl?: string | null;
    isAchievement: boolean;
  }>;
};
type ParticipantRecord = {
  id: string;
  profile_id?: string | null;
  display_name: string;
  role?: string | null;
  competition_teams?: {
    id: string;
    team_name: string;
    category?: string | null;
    format_type?: string | null;
    competitions?: {
      id: string;
      name: string;
      competition_date?: string | null;
      tab_url?: string | null;
    } | null | Array<{ id: string; name: string; competition_date?: string | null; tab_url?: string | null }>;
    competition_participants?: Array<{ profile_id?: string | null; display_name: string; profiles?: { name?: string | null } | null }> | null;
    competition_results?: Array<{
      id: string;
      achievement_name?: string | null;
      result_type?: string | null;
      documentation_url?: string | null;
      is_achievement: boolean;
    }> | null;
  } | null | Array<{
    id: string;
    team_name: string;
    category?: string | null;
    format_type?: string | null;
    competitions?: { id: string; name: string; competition_date?: string | null; tab_url?: string | null } | null | Array<{ id: string; name: string; competition_date?: string | null; tab_url?: string | null }>;
    competition_participants?: Array<{ profile_id?: string | null; display_name: string; profiles?: { name?: string | null } | Array<{ name?: string | null }> | null }> | null;
    competition_results?: Array<{
      id: string;
      achievement_name?: string | null;
      result_type?: string | null;
      documentation_url?: string | null;
      is_achievement: boolean;
    }> | null;
  }>;
};

const emptyProfile: Profile = { name: '', bio: '', caption: '', profile_picture_url: '', avatar_color: 'blue', discord_roles: [], contact_links: { whatsapp: '', website: '' }, achievements: [], debating_history: [] };
const emptySubmissionDraft: CompetitionSubmissionDraft = {
  record_kind: 'history',
  competition_name: '',
  competition_date: '',
  tab_url: '',
  team_name: '',
  participant_names: '',
  internal_teammate_ids: [],
  role: 'Speaker',
  category: 'Open',
  format_type: 'Debate - Team',
  achievement_name: '',
  documentation_url: '',
  is_achievement: false,
};

function getInitials(name?: string) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

function normalizeBookmark(b: BookmarkRow) {
  if (Array.isArray(b.motions)) return b.motions[0] || null;
  return b.motions;
}

function firstItem<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function normalizeUrl(value?: string | null) {
  if (!value) return '';
  const cleaned = value.trim();
  if (!cleaned) return '';
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://${cleaned}`;
}

function formatRecordDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MyProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [bookmarkedMotions, setBookmarkedMotions] = useState<Motion[]>([]);
  const [message, setMessage] = useState('');
  const [roleOptions, setRoleOptions] = useState<DiscordRole[]>(PREDEFINED_ROLES);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [competitionHistory, setCompetitionHistory] = useState<CompetitionHistoryRow[]>([]);
  const [competitionSubmissions, setCompetitionSubmissions] = useState<CompetitionSubmission[]>([]);
  const [canonicalRecords, setCanonicalRecords] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<{ id: string; name: string }[]>([]);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);
  const [submissionDraft, setSubmissionDraft] = useState<CompetitionSubmissionDraft>(emptySubmissionDraft);
  const [submittingRecord, setSubmittingRecord] = useState(false);
  const [teammateSearch, setTeammateSearch] = useState('');
  const [showTeammateDropdown, setShowTeammateDropdown] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);

  const isEb = profile.system_role === 'eb' || profile.system_role === 'admin';
  const isApproved = profile.approval_status === 'approved' || isEb;

  async function fetchProfile(uid: string) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', uid).single();
    if (data) {
      setProfile({ ...emptyProfile, ...data, discord_roles: data.discord_roles || [], contact_links: data.contact_links || {}, achievements: data.achievements || [], debating_history: data.debating_history || [] });
      return data as Profile;
    }
    setEditMode(true);
    return null;
  }

  async function fetchRoleOptions() {
    const { data, error } = await supabase.from('discord_roles').select('id, name, color').order('name');
    if (error || !data?.length) { setRoleOptions(PREDEFINED_ROLES); return; }
    const map = new Map<string, DiscordRole>();
    PREDEFINED_ROLES.forEach((r) => map.set(r.name.toLowerCase(), r));
    (data as DiscordRole[]).forEach((r) => map.set(r.name.toLowerCase(), r));
    setRoleOptions(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function fetchBookmarks(uid: string) {
    const { data } = await supabase.from('bookmarks').select('motion_id, motions (*)').eq('user_id', uid).order('created_at', { ascending: false });
    if (data) setBookmarkedMotions((data as unknown as BookmarkRow[]).map(normalizeBookmark).filter((m): m is Motion => Boolean(m)));
  }

  async function fetchCompetitionHistory(profileId: string) {
    const { data, error } = await supabase
      .from('competition_participants')
      .select(`
        id,
        profile_id,
        display_name,
        role,
        competition_teams (
          id,
          team_name,
          category,
          format_type,
          competitions (
            id,
            name,
            competition_date,
            tab_url
          ),
          competition_participants (
            profile_id,
            display_name,
            profiles (
              name
            )
          ),
          competition_results (
            id,
            achievement_name,
            result_type,
            documentation_url,
            is_achievement
          )
        )
      `)
      .eq('profile_id', profileId);

    if (error) {
      setCompetitionHistory([]);
      return;
    }

    const rows = ((data || []) as unknown as ParticipantRecord[]).map((record) => {
      const team = firstItem(record.competition_teams);
      const competition = firstItem(team?.competitions);
      const participants = team?.competition_participants || [];
      const results = team?.competition_results || [];
      return {
        id: results[0]?.id || record.id,
        competitionName: competition?.name || 'Competition',
        competitionDate: competition?.competition_date || null,
        tabUrl: competition?.tab_url || null,
        teamName: team?.team_name || 'Individual',
        participantNames: participants.map((participant) => firstItem(participant.profiles)?.name || participant.display_name).filter(Boolean),
        participantProfileIds: participants.map((participant) => participant.profile_id).filter((id): id is string => Boolean(id)),
        role: record.role,
        category: team?.category || 'Open',
        formatType: team?.format_type || 'Debate - Team',
        achievements: results.map((result) => ({
          id: result.id,
          achievementName: result.achievement_name || 'Debate record',
          resultType: result.result_type || team?.format_type || 'Debate - Team',
          documentationUrl: result.documentation_url || null,
          isAchievement: result.is_achievement,
        })),
      };
    });

    setCompetitionHistory(rows);
  }

  async function fetchCompetitionSubmissions(uid: string) {
    const { data } = await supabase
      .from('competition_submissions')
      .select('id, status, draft, review_note, created_at')
      .eq('submitted_by', uid)
      .order('created_at', { ascending: false });

    setCompetitionSubmissions((data || []) as CompetitionSubmission[]);
  }

  async function fetchCanonicalRecords() {
    const { data, error } = await supabase
      .from('competition_results')
      .select(`
        id,
        achievement_name,
        result_type,
        is_achievement,
        competition_teams (
          id,
          team_name,
          category,
          format_type,
          competitions (
            id,
            name,
            competition_date
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCanonicalRecords(data);
    }
  }

  async function fetchAllProfiles() {
    const { data } = await supabase.from('profiles').select('id, name').eq('approval_status', 'approved').order('name');
    if (data) setAllProfiles(data);
  }

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user || !file.type.startsWith('image/')) return;
    setUploadingAvatar(true);
    try {
      const blob = await resizeImage(file, 800, 800, 0.8);
      const path = `${user.id}/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('avatars').upload(path, blob, { cacheControl: '3600', upsert: true, contentType: 'image/jpeg' });
      if (error) { setMessage(`Upload gagal: ${error.message}`); return; }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setProfile((c) => ({ ...c, profile_picture_url: data.publicUrl }));
      setMessage('Avatar terupload. Klik Save Profile.');
    } catch (err) { setMessage(`Error: ${err instanceof Error ? err.message : 'Gagal'}`); }
    finally { setUploadingAvatar(false); }
  }

  async function handleHeaderUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user || !file.type.startsWith('image/')) return;
    setUploadingHeader(true);
    try {
      const blob = await resizeImage(file, 1200, 400, 0.85);
      const path = `${user.id}/header_${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('avatars').upload(path, blob, { cacheControl: '3600', upsert: true, contentType: 'image/jpeg' });
      if (error) { setMessage(`Upload gagal: ${error.message}`); return; }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setProfile((c) => ({ ...c, header_picture_url: data.publicUrl }));
      setMessage('Header terupload. Klik Save Profile.');
    } catch (err) { setMessage(`Error: ${err instanceof Error ? err.message : 'Gagal'}`); }
    finally { setUploadingHeader(false); }
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const wasRejected = profile.approval_status === 'rejected';
    const payload = {
      user_id: user.id,
      name: profile.name,
      bio: profile.bio,
      caption: profile.caption,
      avatar_initials: getInitials(profile.name),
      avatar_color: profile.avatar_color,
      profile_picture_url: profile.profile_picture_url,
      header_picture_url: profile.header_picture_url,
      batch: profile.batch || null,
      member_type: profile.member_type || 'newbie',
      debating_experience: profile.debating_experience || null,
      approval_status: profile.approval_status === 'rejected' ? 'pending_approval' : (profile.approval_status || 'pending_approval'),
      rejection_reason: null,
      discord_roles: profile.discord_roles,
      contact_links: profile.contact_links,
      achievements: profile.achievements,
      debating_history: profile.debating_history
    };
    if (profile.id) await supabase.from('profiles').update(payload).eq('id', profile.id);
    else { const { data } = await supabase.from('profiles').insert([{ ...payload, system_role: 'member' }]).select().single(); if (data) setProfile({ ...profile, ...data }); }
    if (wasRejected || !profile.id) {
      await notifyEbAdmins({
        title: wasRejected ? 'Profile Resubmitted' : 'Profile Needs Review',
        message: `${profile.name || 'A member'} ${wasRejected ? 'mengirim ulang profil' : 'mengirim profil'} untuk approval EB/Admin.`,
        link: '/eb-area',
        type: 'admin',
        priority: 'high',
        actionRequired: true,
      });
    }
    setSaving(false); setEditMode(false);
    setMessage(profile.approval_status === 'rejected' ? 'Profil dikirim ulang untuk approval EB/Admin.' : 'Profil tersimpan.');
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setUser({ id: session.user.id, email: session.user.email });
      const loadedProfile = await fetchProfile(session.user.id);
      await Promise.all([
        fetchBookmarks(session.user.id),
        fetchRoleOptions(),
        fetchCompetitionSubmissions(session.user.id),
        fetchAllProfiles(),
        fetchCanonicalRecords(),
        loadedProfile?.id ? fetchCompetitionHistory(loadedProfile.id) : Promise.resolve(),
      ]);
      setLoading(false);
    }
    void init();
  }, [router]);

  function addRole(name: string) {
    const def = roleOptions.find((r) => r.name === name);
    if (!def || profile.discord_roles?.find((r) => r.name === name)) return;
    if (!isEb && RESTRICTED_ROLES.some((r) => name.toLowerCase().includes(r))) { setMessage('Anda tidak dapat memilih role ini.'); return; }
    setProfile({ ...profile, discord_roles: [...(profile.discord_roles || []), def] });
  }

  function removeRole(i: number) {
    const r = profile.discord_roles?.[i];
    if (!r) return;
    if (!isEb && RESTRICTED_ROLES.some((x) => r.name.toLowerCase().includes(x))) { setMessage('Tidak bisa hapus role ini.'); return; }
    const arr = [...(profile.discord_roles || [])]; arr.splice(i, 1);
    setProfile({ ...profile, discord_roles: arr });
  }

  function openSubmissionForm(kind: 'history' | 'achievement') {
    setSubmissionDraft({
      ...emptySubmissionDraft,
      record_kind: kind,
      is_achievement: kind === 'achievement',
      participant_names: profile.name || '',
      achievement_name: kind === 'achievement' ? '' : 'Participation',
    });
    setShowSubmissionForm(true);
    setMessage('');
  }

  function updateSubmissionDraft<K extends keyof CompetitionSubmissionDraft>(field: K, value: CompetitionSubmissionDraft[K]) {
    setSubmissionDraft((current) => ({
      ...current,
      [field]: value,
      ...(field === 'record_kind' ? { is_achievement: value === 'achievement' } : {}),
    }));
  }

  async function submitCompetitionRecord(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    
    if (submissionDraft.record_kind === 'join_request') {
      if (!submissionDraft.original_record_id) {
        setMessage('Silakan pilih record UDF yang ingin digabungi.');
        return;
      }
    } else {
      if (!submissionDraft.competition_name.trim() || !submissionDraft.team_name.trim()) {
        setMessage('Competition name dan team name wajib diisi.');
        return;
      }
      if (submissionDraft.is_achievement && !submissionDraft.achievement_name.trim()) {
        setMessage('Achievement name wajib diisi untuk achievement claim.');
        return;
      }
    }

    setSubmittingRecord(true);
    let error;

    const draftData = {
      ...submissionDraft,
      participant_names: submissionDraft.record_kind === 'join_request' 
        ? submissionDraft.participant_names 
        : (submissionDraft.participant_names || profile.name || '')
    };

    if (editingSubmissionId) {
      const { error: updateError } = await supabase.from('competition_submissions').update({
        draft: draftData,
        status: 'pending',
        reviewed_by: null,
        review_note: null,
      }).eq('id', editingSubmissionId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('competition_submissions').insert({
        submitted_by: user.id,
        draft: draftData,
        status: 'pending',
      });
      error = insertError;
    }

    if (error) {
      setMessage(`Gagal submit record: ${error.message}. Pastikan supabase_competition_records.sql sudah dijalankan.`);
      setSubmittingRecord(false);
      return;
    }

    const requestKind = submissionDraft.record_kind === 'edit_request'
      ? 'edit'
      : submissionDraft.record_kind === 'join_request'
        ? 'join'
        : submissionDraft.record_kind === 'delete_request'
          ? 'delete'
          : submissionDraft.is_achievement
            ? 'achievement'
            : 'record';
    const competitionName = submissionDraft.competition_name || 'UDF record';
    await Promise.all([
      notifyCurrentUser({
        title: editingSubmissionId ? 'Request Revised' : 'Request Sent',
        message: `Your ${requestKind} request for "${competitionName}" was sent to EB/Admin for review.`,
        link: '/my-profile',
        type: 'achievement',
      }),
      notifyEbAdmins({
        title: 'Submission Needs Review',
        message: `${profile.name || 'A member'} submitted a ${requestKind} request for "${competitionName}".`,
        link: '/eb-area',
        type: 'admin',
        priority: 'high',
        actionRequired: true,
      }),
    ]);

    setShowSubmissionForm(false);
    setSubmissionDraft(emptySubmissionDraft);
    setEditingSubmissionId(null);
    setMessage(editingSubmissionId ? 'Submission revised and sent for review.' : 'Record terkirim ke EB/Admin untuk direview.');
    await fetchCompetitionSubmissions(user.id);
    setSubmittingRecord(false);
  }

  async function dismissSubmission(id: string) {
    if (!user) return;
    const { error } = await supabase.from('competition_submissions').delete().eq('id', id);
    if (!error) {
      setCompetitionSubmissions(competitionSubmissions.filter((s) => s.id !== id));
      setMessage('Submission dismissed.');
    } else {
      setMessage(`Gagal dismiss submission: ${error.message}`);
    }
  }

  function addRecord() {
    setProfile({ ...profile, achievements: [...(profile.achievements || []), { id: Date.now().toString(), name: '', competition: '', date: '', type: 'Debate - Team', participant: '', category: 'Open', documentation: '', tab_url: '' }] });
  }

  function updateRecord(i: number, field: keyof Achievement, val: string) {
    const arr = [...(profile.achievements || [])]; arr[i] = { ...arr[i], [field]: val };
    setProfile({ ...profile, achievements: arr });
  }

  function removeRecord(i: number) {
    const arr = [...(profile.achievements || [])]; arr.splice(i, 1);
    setProfile({ ...profile, achievements: arr });
  }

  function startEditRecord(record: CompetitionHistoryRow) {
    const ach = record.achievements[0];
    const selfProfileId = profile.id;
    const internalTeammateIds = record.participantProfileIds.filter((id) => id !== selfProfileId);
    const internalTeammateNames = new Set(
      internalTeammateIds
        .map((id) => allProfiles.find((member) => member.id === id)?.name?.trim().toLowerCase())
        .filter(Boolean)
    );
    const externalParticipantNames = record.participantNames.filter((name) => {
      const normalizedName = name.trim().toLowerCase();
      if (!normalizedName) return false;
      if (profile.name?.trim().toLowerCase() === normalizedName) return false;
      return !internalTeammateNames.has(normalizedName);
    });
    setSubmissionDraft({
      record_kind: 'edit_request',
      original_record_id: record.id,
      competition_name: record.competitionName,
      competition_date: record.competitionDate || '',
      tab_url: record.tabUrl || '',
      team_name: record.teamName,
      participant_names: externalParticipantNames.join(', '),
      internal_teammate_ids: internalTeammateIds,
      role: record.role || 'Speaker',
      category: record.category,
      format_type: record.formatType,
      is_achievement: ach?.isAchievement || false,
      achievement_name: ach?.achievementName || '',
      documentation_url: ach?.documentationUrl || '',
    });
    setEditingSubmissionId(null);
    setShowSubmissionForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleRequestDelete(record: CompetitionHistoryRow) {
    if (!user) return;
    if (!window.confirm(`Apakah Anda yakin ingin meminta penghapusan record "${record.competitionName}" ini dari profil Anda?`)) return;

    setSavingRecord(true);
    const ach = record.achievements[0];
    const selfProfileId = profile.id;
    const internalTeammateIds = record.participantProfileIds.filter((id) => id !== selfProfileId);
    const internalTeammateNames = new Set(
      internalTeammateIds
        .map((id) => allProfiles.find((member) => member.id === id)?.name?.trim().toLowerCase())
        .filter(Boolean)
    );
    const externalParticipantNames = record.participantNames.filter((name) => {
      const normalizedName = name.trim().toLowerCase();
      if (!normalizedName) return false;
      if (profile.name?.trim().toLowerCase() === normalizedName) return false;
      return !internalTeammateNames.has(normalizedName);
    });

    const draftPayload: CompetitionSubmissionDraft = {
      record_kind: 'delete_request',
      original_record_id: record.id,
      competition_name: record.competitionName,
      competition_date: record.competitionDate || '',
      tab_url: record.tabUrl || '',
      team_name: record.teamName,
      participant_names: externalParticipantNames.join(', '),
      internal_teammate_ids: internalTeammateIds,
      role: record.role || 'Speaker',
      category: record.category,
      format_type: record.formatType,
      is_achievement: ach?.isAchievement || false,
      achievement_name: ach?.achievementName || '',
      documentation_url: ach?.documentationUrl || '',
    };

    const { error } = await supabase.from('competition_submissions').insert({
      submitted_by: user.id,
      draft: draftPayload,
      status: 'pending',
    });

    if (error) {
      setMessage(`Gagal mengirim permintaan hapus: ${error.message}`);
    } else {
      setMessage('Permintaan hapus record berhasil dikirim ke EB/Admin untuk direview.');
      await fetchCompetitionSubmissions(user.id);
    }
    setSavingRecord(false);
  }



  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <section className="section active-section" style={{ display: 'block' }}>
      <div className={styles.pageHeader}>
        <div>
          <p className="eyebrow">My Account</p>
          <h2>Personal Dashboard</h2>
        </div>
      </div>

      {!isApproved && (
        <article className="panel" style={{ marginBottom: '1rem', borderColor: profile.approval_status === 'rejected' ? '#bf616a66' : 'var(--line)' }}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">Account Status</p>
              <h3>{profile.approval_status === 'rejected' ? 'Registration Needs Revision' : 'Waiting for EB/Admin Approval'}</h3>
            </div>
            <span className="rank-badge">{profile.approval_status || 'pending_approval'}</span>
          </div>
          <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
            Akunmu sudah terdaftar, tapi akses fitur utama akan dibuka setelah EB/Admin approve. Lengkapi profil di bawah agar proses approval lebih cepat.
          </p>
          {profile.rejection_reason && (
            <p style={{ color: '#bf616a', fontWeight: 800, marginTop: '10px' }}>
              Catatan EB/Admin: {profile.rejection_reason}
            </p>
          )}
        </article>
      )}

      {/* Tab Bar */}
      <div className={styles.tabBar}>
        <button className={`${styles.tabBtn} ${activeTab === 'profile' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('profile')}>
          Profile
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'security' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('security')}>
          Account Settings
        </button>
      </div>

      {/* ══ PROFILE TAB ══ */}
      {activeTab === 'profile' && (
        <div className={styles.tabContent}>
          {/* Action row */}
          <div className={styles.actionRow} style={{ marginBottom: '1rem' }}>
            {editMode ? (
              <button className="primary-button" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            ) : (
              <button className="secondary-button" onClick={() => setEditMode(true)}>Edit Profile</button>
            )}
          </div>

          {/* Profile card */}
          <article className={`${styles.linkedInCard} panel`}>
            <div className={styles.cover} style={profile.header_picture_url ? { backgroundImage: `url(${profile.header_picture_url})` } : undefined}>
              {editMode && (
                <label className={styles.editCoverBtn}>
                  {uploadingHeader ? 'Uploading...' : 'Change Cover'}
                  <input type="file" accept="image/*" onChange={handleHeaderUpload} disabled={uploadingHeader} />
                </label>
              )}
            </div>
            <div className={styles.profileIntro}>
              <div className={styles.avatarWrap}>
                {profile.profile_picture_url ? (
                  <img src={profile.profile_picture_url} alt={profile.name || 'Profile'} className={styles.avatarImage} />
                ) : (
                  <div className={styles.avatarFallback}>{profile.avatar_initials || getInitials(profile.name)}</div>
                )}
              </div>
              <div className={styles.identityBlock}>
                <h1>{profile.name || 'Anonymous User'}</h1>
                <p className={styles.caption}>{profile.caption || 'Debater at Undip Debate Forum'}</p>
                <p className={styles.bio}>{profile.bio || 'No bio provided yet.'}</p>
                <div className={styles.roleRow}>
                  {profile.discord_roles?.length > 0
                    ? profile.discord_roles.map((role, i) => (
                        <span key={`${role.name}-${i}`} className="rank-badge" style={{ background: `${role.color}22`, color: role.color, borderColor: `${role.color}44` }}>
                          {role.name}
                        </span>
                      ))
                    : <span className="rank-badge">Member</span>}
                </div>
              </div>
            </div>
            {editMode && (
              <div className={styles.editGrid}>
                <label className={styles.uploadBox}>
                  <span>Upload Profile Picture</span>
                  <strong>{uploadingAvatar ? 'Uploading...' : 'Choose image'}</strong>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                </label>
                <label>Full Name<input className="input" value={profile.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label>
                <label>Caption<input className="input" value={profile.caption || ''} onChange={(e) => setProfile({ ...profile, caption: e.target.value })} /></label>
                <label>Angkatan<input className="input" placeholder="UDF25" value={profile.batch || ''} onChange={(e) => setProfile({ ...profile, batch: e.target.value })} /></label>
                <label>Status<select className="input" value={profile.member_type || 'newbie'} onChange={(e) => setProfile({ ...profile, member_type: e.target.value })}><option value="newbie">Newbie</option><option value="member">Member</option><option value="alumni">Alumni</option><option value="guest">Guest</option></select></label>
                <label className={styles.fullSpan}>Full Bio<textarea className="input" value={profile.bio || ''} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={3} /></label>
                <label className={styles.fullSpan}>Debating Experience<textarea className="input" value={profile.debating_experience || ''} onChange={(e) => setProfile({ ...profile, debating_experience: e.target.value })} rows={3} /></label>
                <div className={styles.fullSpan}>
                  <label>Discord Roles</label>
                  <div className={styles.roleEditor}>
                    {profile.discord_roles?.map((role, i) => (
                      <span key={`${role.name}-${i}`} className="rank-badge" style={{ background: `${role.color}22`, color: role.color, borderColor: `${role.color}44` }}>
                        {role.name}
                        <button onClick={() => removeRole(i)} type="button" aria-label={`Remove ${role.name}`}>×</button>
                      </span>
                    ))}
                    <select className="input" onChange={(e) => { if (e.target.value) addRole(e.target.value); e.target.value = ''; }}>
                      <option value="">+ Add Role</option>
                      {roleOptions.filter((r) => {
                        const isSel = profile.discord_roles?.find((s) => s.name === r.name);
                        const isRes = RESTRICTED_ROLES.some((x) => r.name.toLowerCase().includes(x));
                        if (!isEb && isRes) return false;
                        return !isSel;
                      }).map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
                    </select>
                  </div>
                </div>
                <label>WhatsApp<input className="input" value={profile.contact_links?.whatsapp || ''} onChange={(e) => setProfile({ ...profile, contact_links: { ...profile.contact_links, whatsapp: e.target.value } })} /></label>
                <label>Website<input className="input" value={profile.contact_links?.website || ''} onChange={(e) => setProfile({ ...profile, contact_links: { ...profile.contact_links, website: e.target.value } })} /></label>
              </div>
            )}
          </article>

          {message && <div className={styles.notice}>{message}</div>}

          {/* ── Unified Debate History & Achievements ── */}
          <article className="panel" style={{ marginTop: '1.25rem' }}>
            <div className="panel-header">
              <div>
                <h3>Debate History &amp; Achievements</h3>
                <p className={styles.subtle}>Semua kompetisi dan prestasi kamu dalam satu tempat.</p>
              </div>
              <button className="secondary-button" type="button" onClick={() => {
                setSubmissionDraft(emptySubmissionDraft);
                setEditingSubmissionId(null);
                setShowSubmissionForm(true);
              }}>
                + Add Past Debate Record
              </button>
            </div>

            {/* Submission form */}
            {showSubmissionForm && (
              <form className={styles.recordEditor} onSubmit={submitCompetitionRecord} style={{ marginBottom: '1rem' }}>
                <div className={styles.recordForm}>
                  <label>Tipe Record
                    <select className="input" value={submissionDraft.record_kind} onChange={(e) => updateSubmissionDraft('record_kind', e.target.value as any)}>
                      <option value="history">📋 Debate History (kompetisi baru)</option>
                      <option value="achievement">🏆 Achievement Claim (prestasi baru)</option>
                      <option value="join_request">🔗 Join Existing UDF Record (gabung record teman)</option>
                    </select>
                  </label>

                  {submissionDraft.record_kind === 'join_request' && (
                    <label className={styles.fullSpan}>Pilih Record UDF yang Sudah Ada
                      <select 
                        className="input" 
                        value={submissionDraft.original_record_id || ''} 
                        onChange={(e) => {
                          const recordId = e.target.value;
                          const record = canonicalRecords.find(r => r.id === recordId);
                          if (record) {
                            const team = firstItem(record.competition_teams);
                            const comp = firstItem(team?.competitions);
                            setSubmissionDraft((current) => ({
                              ...current,
                              original_record_id: recordId,
                              competition_name: comp?.name || '',
                              competition_date: comp?.competition_date || '',
                              tab_url: comp?.tab_url || '',
                              team_name: team?.team_name || '',
                              category: team?.category || 'Open',
                              format_type: team?.format_type || 'Debate - Team',
                              achievement_name: record.achievement_name || 'Participation',
                              documentation_url: record.documentation_url || '',
                              is_achievement: Boolean(record.is_achievement),
                            }));
                          } else {
                            setSubmissionDraft((current) => ({
                              ...current,
                              original_record_id: '',
                            }));
                          }
                        }}
                        required
                      >
                        <option value="">-- Pilih Record --</option>
                        {canonicalRecords.map((record) => {
                          const team = firstItem(record.competition_teams);
                          const comp = firstItem(team?.competitions);
                          const displayComp = comp?.name || 'Unknown Competition';
                          const displayTeam = team?.team_name || 'Unknown Team';
                          const displayAch = record.is_achievement ? ` [🏆 ${record.achievement_name}]` : '';
                          const displayDate = comp?.competition_date ? ` (${comp.competition_date})` : '';
                          return (
                            <option key={record.id} value={record.id}>
                              {displayComp} - {displayTeam}{displayAch}{displayDate}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                  )}

                  {submissionDraft.record_kind !== 'join_request' ? (
                    <>
                      <label>Competition<input className="input" value={submissionDraft.competition_name} onChange={(e) => updateSubmissionDraft('competition_name', e.target.value)} required /></label>
                      <label>Date<input type="date" className="input" value={submissionDraft.competition_date} onChange={(e) => updateSubmissionDraft('competition_date', e.target.value)} /></label>
                      <label>Category
                        <select className="input" value={submissionDraft.category} onChange={(e) => updateSubmissionDraft('category', e.target.value)}>
                          <option>Open</option><option>Novice</option><option>Rookie</option><option>ESL</option>
                        </select>
                      </label>
                      <label>Type
                        <select className="input" value={submissionDraft.format_type} onChange={(e) => updateSubmissionDraft('format_type', e.target.value)}>
                          <option>Debate - Team</option><option>Debate - Individual</option><option>Adjudicator</option>
                        </select>
                      </label>
                      <label>Team Name<input className="input" value={submissionDraft.team_name} onChange={(e) => updateSubmissionDraft('team_name', e.target.value)} placeholder="UNDIP A / Individual" required /></label>
                      <div className={styles.fullSpan}>
                        <label>Internal Teammates (Registered Members)</label>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8, position: 'relative' }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <input 
                              className="input" 
                              value={teammateSearch}
                              onChange={(e) => { setTeammateSearch(e.target.value); setShowTeammateDropdown(true); }}
                              onFocus={() => setShowTeammateDropdown(true)}
                              onBlur={() => setTimeout(() => setShowTeammateDropdown(false), 200)}
                              placeholder="Ketik nama untuk mencari teammate..."
                            />
                            {showTeammateDropdown && teammateSearch && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: 'auto', marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                {allProfiles
                                  .filter((p) => {
                                    if (!p.id || p.id === profile.id) return false;
                                    if (submissionDraft.internal_teammate_ids?.includes(p.id)) return false;
                                    return Boolean(p.name?.toLowerCase().includes(teammateSearch.toLowerCase()));
                                  })
                                  .map(p => (
                                    <div 
                                      key={p.id} 
                                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--line)' }}
                                      onMouseDown={() => {
                                        const nextIds = Array.from(new Set([...(submissionDraft.internal_teammate_ids || []), p.id!]));
                                        const selectedName = p.name?.trim().toLowerCase();
                                        const nextExternalNames = submissionDraft.participant_names
                                          .split(',')
                                          .map((name) => name.trim())
                                          .filter((name) => name && name.toLowerCase() !== selectedName)
                                          .join(', ');
                                        setSubmissionDraft((current) => ({
                                          ...current,
                                          internal_teammate_ids: nextIds,
                                          participant_names: nextExternalNames,
                                        }));
                                        setTeammateSearch('');
                                        setShowTeammateDropdown(false);
                                      }}
                                    >
                                      {p.name}
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {submissionDraft.internal_teammate_ids && submissionDraft.internal_teammate_ids.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                            {submissionDraft.internal_teammate_ids.map(id => {
                              const p = allProfiles.find(x => x.id === id);
                              return (
                                <span key={id} className="rank-badge" style={{ gap: 6 }}>
                                  {p?.name} 
                                  <button 
                                    type="button" 
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }} 
                                    onClick={() => updateSubmissionDraft('internal_teammate_ids', submissionDraft.internal_teammate_ids!.filter(x => x !== id))}
                                  >
                                    ✕
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <label className={styles.fullSpan}>External / Unregistered Teammates (Comma Separated)<input className="input" value={submissionDraft.participant_names} onChange={(e) => updateSubmissionDraft('participant_names', e.target.value)} placeholder="e.g. John Doe, Jane Smith" /></label>
                      <label>Role<input className="input" value={submissionDraft.role} onChange={(e) => updateSubmissionDraft('role', e.target.value)} placeholder="Speaker / Adjudicator / Coach" /></label>
                      <label>TAB Link<input className="input" value={submissionDraft.tab_url} onChange={(e) => updateSubmissionDraft('tab_url', e.target.value)} /></label>
                      {submissionDraft.record_kind === 'achievement' && (
                        <>
                          <label className={styles.fullSpan}>Achievement Name<input className="input" value={submissionDraft.achievement_name} onChange={(e) => updateSubmissionDraft('achievement_name', e.target.value)} placeholder="Juara 1 / Best Speaker / Finalist" /></label>
                          <label className={styles.fullSpan}>Documentation Link<input className="input" value={submissionDraft.documentation_url} onChange={(e) => updateSubmissionDraft('documentation_url', e.target.value)} /></label>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <label className={styles.fullSpan}>Role Anda dalam Record Ini<input className="input" value={submissionDraft.role} onChange={(e) => updateSubmissionDraft('role', e.target.value)} placeholder="Speaker / Adjudicator / Coach" required /></label>
                    </>
                  )}
                  <div className={styles.fullSpan} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="primary-button" type="submit" disabled={submittingRecord}>{submittingRecord ? 'Submitting...' : 'Submit for Review'}</button>
                    <button className="ghost-button" type="button" onClick={() => setShowSubmissionForm(false)}>Cancel</button>
                  </div>
                </div>
              </form>
            )}

            {/* Pending / Rejected submissions only — hide approved ones */}
            {competitionSubmissions.filter((s) => s.status !== 'approved').length > 0 && (
              <div style={{ margin: '0 0 1rem', padding: '0 1rem' }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Submission Status</p>
                <div className={styles.achievementList}>
                  {competitionSubmissions.filter((s) => s.status !== 'approved').map((sub) => (
                    <div key={sub.id} className={styles.achievementCard} style={{ borderLeft: `3px solid ${sub.status === 'rejected' ? '#dc2626' : 'var(--gold)'}` }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: sub.status === 'pending' ? 'var(--gold-soft)' : sub.status === 'approved' ? 'var(--green-soft)' : '#fee2e2', color: sub.status === 'pending' ? '#765710' : sub.status === 'approved' ? 'var(--green)' : '#dc2626' }}>
                            {sub.status.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'var(--paper)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
                            {sub.draft.record_kind === 'achievement' 
                              ? '🏆 Achievement' 
                              : sub.draft.record_kind === 'edit_request' 
                              ? '✏️ Edit Request' 
                              : sub.draft.record_kind === 'join_request' 
                              ? '🔗 Join Request' 
                              : sub.draft.record_kind === 'delete_request' 
                              ? '❌ Delete Request' 
                              : '📋 History'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => dismissSubmission(sub.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, fontSize: '1rem', lineHeight: 1 }}
                          title="Dismiss"
                        >
                          ✕
                        </button>
                      </div>
                      <strong>{sub.draft.achievement_name || sub.draft.competition_name}</strong>
                      <p>{sub.draft.competition_name} / {sub.draft.team_name}</p>
                      <small>{sub.review_note || 'Waiting for EB/Admin review'}</small>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approved records (history + achievements merged) */}
            <div className={styles.achievementList}>
              {competitionHistory.map((record) => (
                <div key={record.id} className={styles.achievementCard}>
                  {/* ── View Mode ── */}
                    <>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'var(--green-soft)', color: 'var(--green)' }}>✓ Approved</span>
                          {record.achievements.some((a) => a.isAchievement) ? (
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#fef9c3', color: '#854d0e' }}>
                              🏆 {record.achievements.filter((a) => a.isAchievement).map((a) => a.achievementName).join(', ')}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'var(--paper)', color: 'var(--muted)', border: '1px solid var(--line)' }}>📋 History</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => startEditRecord(record)}
                            style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 6, padding: '2px 10px', fontSize: '0.8rem', color: 'var(--muted)', cursor: 'pointer' }}
                            title="Submit an edit request for EB/Admin approval"
                          >
                            ✏ Request Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequestDelete(record)}
                            style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 6, padding: '2px 10px', fontSize: '0.8rem', color: '#bf616a', cursor: 'pointer' }}
                            title="Submit a delete request for EB/Admin approval"
                          >
                            ❌ Request Delete
                          </button>
                        </div>
                      </div>
                      <strong>{record.competitionName}</strong>
                      <span>{formatRecordDate(record.competitionDate)}</span>
                      <p>{record.teamName} / {record.category} / {record.formatType}</p>
                      <small>{record.participantNames.join(', ') || 'No participants listed'}</small>
                      {record.achievements.filter((a) => a.documentationUrl).map((a) => (
                        <a key={a.id} href={normalizeUrl(a.documentationUrl!)} target="_blank" rel="noreferrer">View Documentation</a>
                      ))}
                      {record.tabUrl && <a href={normalizeUrl(record.tabUrl)} target="_blank" rel="noreferrer">View TAB</a>}
                    </>
                </div>
              ))}

              {/* Legacy profile achievements */}
              {profile.achievements?.length > 0 && profile.achievements.map((a, i) => (
                <div key={a.id || `legacy-${i}`} className={styles.achievementCard} style={{ borderLeft: '3px solid var(--muted)' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'var(--paper)', color: 'var(--muted)', border: '1px solid var(--line)' }}>Legacy</span>
                  </div>
                  <strong>{a.name}</strong>
                  <span>{a.date}</span>
                  <p>{a.competition}</p>
                  <small>{a.type} / {a.category} / {a.participant}</small>
                  {a.documentation && <a href={a.documentation} target="_blank" rel="noreferrer">View Documentation</a>}
                  {a.tab_url && <a href={a.tab_url} target="_blank" rel="noreferrer">View TAB</a>}
                </div>
              ))}

              {competitionHistory.length === 0 && !(profile.achievements?.length > 0) && (
                <p className={styles.emptyState}>Belum ada debate history atau achievement. Klik &quot;+ Submit Record&quot; untuk mulai!</p>
              )}
            </div>
          </article>

          {/* ── Bookmarked Motions ── */}
          <article className="panel" style={{ marginTop: '1.25rem' }}>
            <div className="panel-header">
              <h3>Bookmarked Motions</h3>
            </div>
            {bookmarkedMotions.length === 0 ? (
              <p className={styles.emptyState} style={{ padding: '1rem' }}>You have not bookmarked any motions yet.</p>
            ) : (
              <div className={styles.bookmarkList}>
                {bookmarkedMotions.map((m) => (
                  <div key={m.id} className={styles.bookmarkCard}>
                    <h4>{m.competition ? `${m.competition} ${m.year || ''}` : 'Independent Motion'}</h4>
                    <strong>{m.text}</strong>
                    <span>{m.motion_type && `/ ${m.motion_type}`}</span>
                    {m.tab_url && <a href={m.tab_url} target="_blank" rel="noreferrer">View Tab</a>}
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>
      )}

      {/* ══ ACCOUNT SETTINGS TAB ══ */}
      {activeTab === 'security' && <AccountSettings />}
    </section>
  );
}
