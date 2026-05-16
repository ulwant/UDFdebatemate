'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
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
  discord_roles?: DiscordRole[];
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
  const [activeAreaTab, setActiveAreaTab] = useState<'attendance' | 'roles' | 'authority'>('attendance');

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
    Promise.all([fetchAttendance(), fetchRoles()]).catch(console.error);
  }, [userId, selectedMonth, loading]);

  async function fetchRoles() {
    const { data } = await supabase.from('discord_roles').select('*').order('name', { ascending: true });
    if (data) setRoleOptions(data);
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
        .select('id, user_id, name, caption, profile_picture_url, avatar_initials, avatar_color, system_role, discord_roles')
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
    const { error } = await supabase.from('profiles').update({ system_role: newRole }).eq('id', profileId);
    if (error) {
      setAttendanceMessage(`Gagal mengubah system role: ${error.message}`);
      return;
    }
    setAttendanceMessage('System role berhasil diupdate.');
    await fetchAttendance(); // refresh profiles
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
    await supabase.from('weekly_sessions').insert({
      title: newWeeklyTitle,
      scheduled_at: new Date(newWeeklyDate).toISOString(),
      notes: newWeeklyNotes || null,
      created_by: userId,
    });
    setNewWeeklyTitle(''); setNewWeeklyDate(''); setNewWeeklyNotes('');
    await fetchAttendance();
  }

  async function updateWeeklySession(weeklyId: string, payload: Partial<WeeklySession>) {
    await supabase.from('weekly_sessions').update(payload).eq('id', weeklyId);
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

  return (
    <section className="section active-section" style={{ display: 'block' }}>
      <div className={styles.pageHeader}>
        <div>
          <p className="eyebrow">EB Area</p>
          <h2>Operations Dashboard</h2>
        </div>
        <div className="segmented" role="group">
          <button className={`segment ${activeAreaTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveAreaTab('attendance')}>Attendance</button>
          <button className={`segment ${activeAreaTab === 'roles' ? 'active' : ''}`} onClick={() => setActiveAreaTab('roles')}>Role Management</button>
          {isAdmin && (
            <button className={`segment ${activeAreaTab === 'authority' ? 'active' : ''}`} onClick={() => setActiveAreaTab('authority')}>User Authority</button>
          )}
        </div>
      </div>

      {attendanceMessage && <div className={styles.notice}>{attendanceMessage}</div>}

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
