'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/app/components/ToastContext';
import styles from './AchievementBase.module.css';

type LegacyAchievement = {
  id?: string;
  name?: string;
  competition?: string;
  date?: string;
  type?: string;
  participant?: string;
  category?: string;
  documentation?: string;
  tab_url?: string;
};

type LegacyProfileRow = {
  id: string;
  name?: string;
  achievements?: LegacyAchievement[] | null;
};

type ParticipantRow = {
  display_name: string;
  role?: string | null;
  profiles?: { id: string; name?: string | null } | null;
};

type CanonicalResultRow = {
  id: string;
  achievement_name?: string | null;
  result_type?: string | null;
  documentation_url?: string | null;
  is_achievement: boolean;
  competition_teams?: {
    id: string;
    team_name: string;
    category?: string | null;
    format_type?: string | null;
    competitions?: {
      id: string;
      name: string;
      competition_date?: string | null;
      category?: string | null;
      tab_url?: string | null;
    } | null | Array<{
      id: string;
      name: string;
      competition_date?: string | null;
      category?: string | null;
      tab_url?: string | null;
    }>;
    competition_participants?: ParticipantRow[] | null;
  } | null | Array<{
    id: string;
    team_name: string;
    category?: string | null;
    format_type?: string | null;
    competitions?: CanonicalResultRow['competition_teams'] extends Array<infer U> ? U : never;
    competition_participants?: ParticipantRow[] | null;
  }>;
};

type AchievementRow = {
  rowId: string;
  source: 'canonical' | 'legacy';
  achievementName: string;
  competitionName: string;
  date?: string | null;
  type: string;
  teamName: string;
  participants: string[];
  category: string;
  tabUrl?: string | null;
  docsUrl?: string | null;
};

type SortKey = 'date' | 'achievementName' | 'competitionName' | 'type' | 'category' | 'teamName';

function normalizeUrl(value?: string | null) {
  if (!value) return '';
  const cleaned = value.trim();
  if (!cleaned) return '';
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://${cleaned}`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getYear(value?: string | null) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 4) || 'Unknown';
  return String(date.getFullYear());
}

function badgeClassForType(type?: string) {
  const value = (type || '').toLowerCase();
  if (value.includes('individual')) return styles.typeIndividual;
  if (value.includes('adjudicator')) return styles.typeAdjudicator;
  return styles.typeTeam;
}

function badgeClassForCategory(category?: string) {
  const value = (category || '').toLowerCase();
  if (value.includes('open')) return styles.categoryOpen;
  if (value.includes('novice')) return styles.categoryNovice;
  return styles.categoryOther;
}

function firstItem<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function canonicalToRow(result: CanonicalResultRow): AchievementRow | null {
  if (!result.is_achievement) return null;
  const team = firstItem(result.competition_teams);
  const competition = firstItem(team?.competitions);
  const participants = (team?.competition_participants || [])
    .map((participant) => participant.profiles?.name || participant.display_name)
    .filter(Boolean);

  return {
    rowId: result.id,
    source: 'canonical',
    achievementName: result.achievement_name || 'Achievement',
    competitionName: competition?.name || 'Competition',
    date: competition?.competition_date || null,
    type: result.result_type || team?.format_type || 'Debate - Team',
    teamName: team?.team_name || 'Independent / Individual',
    participants,
    category: team?.category || competition?.category || 'Open',
    tabUrl: competition?.tab_url || null,
    docsUrl: result.documentation_url || null,
  };
}

function legacyToRows(profiles: LegacyProfileRow[]): AchievementRow[] {
  return profiles.flatMap((profile) => (
    (profile.achievements || [])
      .filter((achievement) => achievement.name || achievement.competition)
      .map((achievement, index) => ({
        rowId: `legacy-${profile.id}-${achievement.id || index}`,
        source: 'legacy' as const,
        achievementName: achievement.name || 'Achievement',
        competitionName: achievement.competition || 'Competition',
        date: achievement.date || null,
        type: achievement.type || 'Debate - Team',
        teamName: achievement.type?.toLowerCase().includes('individual') ? 'Individual' : (achievement.participant || 'Team'),
        participants: [achievement.participant || profile.name || 'Participant'],
        category: achievement.category || 'Open',
        tabUrl: achievement.tab_url || null,
        docsUrl: achievement.documentation || null,
      }))
  ));
}

export default function AchievementBasePage() {
  const { addToast } = useToast();
  const [rows, setRows] = useState<AchievementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [notice, setNotice] = useState('');

  // EB/Admin Direct CRUD States
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [rawCanonicalRecords, setRawCanonicalRecords] = useState<CanonicalResultRow[]>([]);
  const [allProfiles, setAllProfiles] = useState<{ id: string; name: string }[]>([]);

  // Modal Dialog States
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [savingRecord, setSavingRecord] = useState(false);

  // Form Fields
  const [formCompetitionName, setFormCompetitionName] = useState('');
  const [formCompetitionDate, setFormCompetitionDate] = useState('');
  const [formCategory, setFormCategory] = useState('Open');
  const [formFormatType, setFormFormatType] = useState('Debate - Team');
  const [formTeamName, setFormTeamName] = useState('');
  const [formRole, setFormRole] = useState('Speaker');
  const [formInternalTeammates, setFormInternalTeammates] = useState<string[]>([]);
  const [formExternalTeammates, setFormExternalTeammates] = useState('');
  const [formIsAchievement, setFormIsAchievement] = useState(true);
  const [formAchievementName, setFormAchievementName] = useState('');
  const [formDocumentationUrl, setFormDocumentationUrl] = useState('');
  const [formTabUrl, setFormTabUrl] = useState('');

  const [teammateSearch, setTeammateSearch] = useState('');
  const [showTeammateDropdown, setShowTeammateDropdown] = useState(false);

  const isEbOrAdmin = currentUserRole === 'eb' || currentUserRole === 'admin';
  const notifyError = (message: string) => addToast({ title: 'Achievement Error', message, type: 'error' });
  const notifySuccess = (message: string) => addToast({ title: 'Achievement Base', message, type: 'success' });

  async function fetchAchievements() {
    setLoading(true);
    setNotice('');

    const { data: canonicalData, error: canonicalError } = await supabase
      .from('competition_results')
      .select(`
        id,
        achievement_name,
        result_type,
        documentation_url,
        is_achievement,
        competition_teams (
          id,
          team_name,
          category,
          format_type,
          competitions (
            id,
            name,
            competition_date,
            category,
            tab_url
          ),
          competition_participants (
            id,
            display_name,
            role,
            profiles (
              id,
              name
            )
          )
        )
      `)
      .eq('is_achievement', true)
      .order('created_at', { ascending: false });

    if (!canonicalError && canonicalData) {
      setRawCanonicalRecords(canonicalData as unknown as CanonicalResultRow[]);
      setRows(((canonicalData || []) as unknown as CanonicalResultRow[]).map(canonicalToRow).filter((row): row is AchievementRow => Boolean(row)));
      setLoading(false);
      return;
    }

    const { data: legacyData, error: legacyError } = await supabase
      .from('profiles')
      .select('id, name, achievements')
      .eq('approval_status', 'approved');

    if (legacyError) {
      setNotice(`Gagal memuat achievement base: ${legacyError.message}`);
      setRows([]);
    } else {
      setRows(legacyToRows((legacyData || []) as LegacyProfileRow[]));
      setNotice('Achievement Base sedang memakai legacy fallback. Jalankan supabase_competition_records.sql untuk canonical records.');
    }

    setLoading(false);
  }

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser({ id: session.user.id, email: session.user.email });
        const { data: profile } = await supabase
          .from('profiles')
          .select('system_role')
          .eq('user_id', session.user.id)
          .single();
        if (profile) {
          setCurrentUserRole(profile.system_role);
        }
      }
    }
    const loadTimer = window.setTimeout(() => { void loadUser(); }, 0);
    const achievementsTimer = window.setTimeout(() => { void fetchAchievements(); }, 0);
    return () => {
      window.clearTimeout(loadTimer);
      window.clearTimeout(achievementsTimer);
    };
  }, []);

  useEffect(() => {
    async function fetchProfiles() {
      const { data } = await supabase.from('profiles').select('id, name').eq('approval_status', 'approved').order('name');
      if (data) setAllProfiles(data);
    }
    if (isEbOrAdmin) {
      void fetchProfiles();
    }
  }, [isEbOrAdmin]);

  // Handlers for Add, Edit, Delete
  function handleStartAdd() {
    setEditingResultId(null);
    setFormCompetitionName('');
    setFormCompetitionDate('');
    setFormCategory('Open');
    setFormFormatType('Debate - Team');
    setFormTeamName('');
    setFormRole('Speaker');
    setFormInternalTeammates([]);
    setFormExternalTeammates('');
    setFormIsAchievement(true);
    setFormAchievementName('');
    setFormDocumentationUrl('');
    setFormTabUrl('');
    setShowFormModal(true);
  }

  function handleStartEdit(rowId: string) {
    const resultObj = rawCanonicalRecords.find(r => r.id === rowId);
    if (!resultObj) {
      notifyError('Record not found.');
      return;
    }

    const teamObj = resultObj ? firstItem(resultObj.competition_teams) : null;
    const compObj = teamObj ? firstItem(teamObj.competitions) : null;

    if (!teamObj || !compObj) {
      notifyError('Team/Competition record details not found.');
      return;
    }

    const participants = teamObj.competition_participants || [];
    const internalIds = participants
      .map(p => p.profiles?.id || '')
      .filter(Boolean);

    const externalNames = participants
      .filter(p => !p.profiles?.id)
      .map(p => p.display_name)
      .join(', ');

    const defaultRole = participants[0]?.role || 'Speaker';

    setEditingResultId(rowId);
    setFormCompetitionName(compObj.name || '');
    setFormCompetitionDate(compObj.competition_date || '');
    setFormCategory(teamObj.category || compObj.category || 'Open');
    setFormFormatType(teamObj.format_type || 'Debate - Team');
    setFormTeamName(teamObj.team_name || '');
    setFormRole(defaultRole);
    setFormInternalTeammates(internalIds);
    setFormExternalTeammates(externalNames);
    setFormIsAchievement(resultObj.is_achievement);
    setFormAchievementName(resultObj.achievement_name || '');
    setFormDocumentationUrl(resultObj.documentation_url || '');
    setFormTabUrl(compObj.tab_url || '');

    setShowFormModal(true);
  }

  async function handleDelete(rowId: string) {
    if (!window.confirm('Are you sure you want to delete this achievement record?')) return;

    const resultObj = rawCanonicalRecords.find(r => r.id === rowId);
    const teamObj = resultObj ? firstItem(resultObj.competition_teams) : null;
    if (!teamObj) {
      notifyError('Team record not found for deletion.');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('competition_teams')
      .delete()
      .eq('id', teamObj.id);

    if (error) {
      notifyError(`Failed to delete record: ${error.message}`);
    } else {
      setNotice('Record successfully deleted.');
      notifySuccess('Record successfully deleted.');
      await fetchAchievements();
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formCompetitionName.trim() || !formTeamName.trim()) {
      notifyError('Competition Name and Team Name are required.');
      return;
    }
    if (formIsAchievement && !formAchievementName.trim()) {
      notifyError('Achievement Name is required if this is an achievement.');
      return;
    }

    setSavingRecord(true);

    try {
      if (editingResultId) {
        // Edit Mode:
        const resultObj = rawCanonicalRecords.find(r => r.id === editingResultId);
        const teamObj = resultObj ? firstItem(resultObj.competition_teams) : null;
        const compObj = teamObj ? firstItem(teamObj.competitions) : null;

        if (!teamObj || !compObj) {
          notifyError('Original record components not found.');
          setSavingRecord(false);
          return;
        }

        // 1. Update Competition
        const { error: compErr } = await supabase.from('competitions').update({
          name: formCompetitionName.trim(),
          competition_date: formCompetitionDate || null,
          category: formCategory || null,
          tab_url: formTabUrl || null,
        }).eq('id', compObj.id);

        if (compErr) throw compErr;

        // 2. Update Team
        const { error: teamErr } = await supabase.from('competition_teams').update({
          team_name: formTeamName.trim(),
          category: formCategory || null,
          format_type: formFormatType || 'Debate - Team',
        }).eq('id', teamObj.id);

        if (teamErr) throw teamErr;

        // 3. Update Result
        const { error: resultErr } = await supabase.from('competition_results').update({
          achievement_name: formIsAchievement ? formAchievementName : 'Participation',
          result_type: formFormatType || 'Debate - Team',
          documentation_url: formDocumentationUrl || null,
          is_achievement: Boolean(formIsAchievement),
        }).eq('id', editingResultId);

        if (resultErr) throw resultErr;

        // 4. Update Participants (Wipe & Re-insert)
        const linkedProfiles = formInternalTeammates
          .map(id => allProfiles.find(p => p.id === id))
          .filter(Boolean);

        const externalNames = formExternalTeammates
          .split(',')
          .map(name => name.trim())
          .filter(Boolean);

        const targetParticipants = [
          ...linkedProfiles.map(p => ({
            team_id: teamObj.id,
            profile_id: p!.id,
            display_name: p!.name || 'Unnamed Member',
            role: formRole,
          })),
          ...externalNames.map(name => ({
            team_id: teamObj.id,
            profile_id: null as string | null,
            display_name: name,
            role: formRole,
          }))
        ];

        const { error: delPartErr } = await supabase.from('competition_participants').delete().eq('team_id', teamObj.id);
        if (delPartErr) throw delPartErr;

        if (targetParticipants.length > 0) {
          const { error: insPartErr } = await supabase.from('competition_participants').insert(targetParticipants);
          if (insPartErr) throw insPartErr;
        }

      } else {
        // Add Mode:
        // Match Competition Name
        let competitionId = '';
        const { data: existingComp } = await supabase
          .from('competitions')
          .select('id')
          .ilike('name', formCompetitionName.trim())
          .limit(1);

        if (existingComp && existingComp.length > 0) {
          competitionId = existingComp[0].id;
          await supabase.from('competitions').update({
            competition_date: formCompetitionDate || null,
            category: formCategory || null,
            tab_url: formTabUrl || null,
          }).eq('id', competitionId);
        } else {
          const { data: newComp, error: compErr } = await supabase
            .from('competitions')
            .insert({
              name: formCompetitionName.trim(),
              competition_date: formCompetitionDate || null,
              category: formCategory || null,
              tab_url: formTabUrl || null,
              created_by: currentUser?.id,
            })
            .select('id')
            .single();

          if (compErr || !newComp) throw compErr || new Error('Failed to create competition');
          competitionId = newComp.id;
        }

        // Match Team Name
        let teamId = '';
        const { data: existingTeam } = await supabase
          .from('competition_teams')
          .select('id')
          .eq('competition_id', competitionId)
          .ilike('team_name', formTeamName.trim())
          .limit(1);

        if (existingTeam && existingTeam.length > 0) {
          teamId = existingTeam[0].id;
          await supabase.from('competition_teams').update({
            category: formCategory || null,
            format_type: formFormatType || 'Debate - Team',
          }).eq('id', teamId);
        } else {
          const { data: newTeam, error: teamErr } = await supabase
            .from('competition_teams')
            .insert({
              competition_id: competitionId,
              team_name: formTeamName.trim(),
              category: formCategory || null,
              format_type: formFormatType || 'Debate - Team',
              created_by: currentUser?.id,
            })
            .select('id')
            .single();

          if (teamErr || !newTeam) throw teamErr || new Error('Failed to create team');
          teamId = newTeam.id;
        }

        // Insert Result
        const { error: resultErr } = await supabase.from('competition_results').insert({
          team_id: teamId,
          achievement_name: formIsAchievement ? formAchievementName : 'Participation',
          result_type: formFormatType || 'Debate - Team',
          documentation_url: formDocumentationUrl || null,
          is_achievement: Boolean(formIsAchievement),
          created_by: currentUser?.id,
        });

        if (resultErr) throw resultErr;

        // Insert Participants
        const linkedProfiles = formInternalTeammates
          .map(id => allProfiles.find(p => p.id === id))
          .filter(Boolean);

        const externalNames = formExternalTeammates
          .split(',')
          .map(name => name.trim())
          .filter(Boolean);

        const targetParticipants = [
          ...linkedProfiles.map(p => ({
            team_id: teamId,
            profile_id: p!.id,
            display_name: p!.name || 'Unnamed Member',
            role: formRole,
          })),
          ...externalNames.map(name => ({
            team_id: teamId,
            profile_id: null as string | null,
            display_name: name,
            role: formRole,
          }))
        ];

        // Wipe participants first to avoid duplication if reusing team
        const { error: delPartErr } = await supabase.from('competition_participants').delete().eq('team_id', teamId);
        if (delPartErr) throw delPartErr;

        if (targetParticipants.length > 0) {
          const { error: insPartErr } = await supabase.from('competition_participants').insert(targetParticipants);
          if (insPartErr) throw insPartErr;
        }
      }

      setShowFormModal(false);
      setNotice(editingResultId ? 'Record successfully updated.' : 'Record successfully added.');
      notifySuccess(editingResultId ? 'Record successfully updated.' : 'Record successfully added.');
      await fetchAchievements();
    } catch (err: unknown) {
      notifyError(`Database write error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSavingRecord(false);
    }
  }

  const typeOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.type).filter(Boolean))).sort(), [rows]);
  const categoryOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.category).filter(Boolean))).sort(), [rows]);
  const yearOptions = useMemo(() => Array.from(new Set(rows.map((row) => getYear(row.date)))).sort((a, b) => b.localeCompare(a)), [rows]);
  const yearlyStats = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((row) => counts.set(getYear(row.date), (counts.get(getYear(row.date)) || 0) + 1));
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([year, count]) => ({ year, count }));
  }, [rows]);
  const maxYearlyCount = Math.max(1, ...yearlyStats.map((item) => item.count));

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const haystack = [
        row.achievementName,
        row.competitionName,
        row.teamName,
        row.participants.join(' '),
        row.category,
        row.type,
      ].join(' ').toLowerCase();

      if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;
      if (typeFilter !== 'all' && row.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && row.category !== categoryFilter) return false;
      if (yearFilter !== 'all' && getYear(row.date) !== yearFilter) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      const value = sortKey === 'date'
        ? new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()
        : String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''));

      return sortDirection === 'asc' ? value : -value;
    });
  }, [categoryFilter, query, rows, sortDirection, sortKey, typeFilter, yearFilter]);

  function changeSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(nextKey);
    setSortDirection(nextKey === 'date' ? 'desc' : 'asc');
  }

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, typeFilter, categoryFilter, yearFilter, sortKey, sortDirection]);

  const totalPages = Math.ceil(visibleRows.length / ITEMS_PER_PAGE);
  const paginatedRows = visibleRows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <section className={`section active-section ${styles.shell}`} style={{ display: 'grid' }}>
      <div className={styles.header}>
        <div>
          <p className="eyebrow">Achievement Base</p>
          <h2>All UDF achievement records</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {isEbOrAdmin && (
            <button className="primary-button" onClick={handleStartAdd}>
              + Add New Record
            </button>
          )}
          <div className={styles.summary}>
            <span>{visibleRows.length} shown</span>
            <span>{rows.length} total records</span>
          </div>
        </div>
      </div>

      {notice && <div className="panel" style={{ color: notice.includes('Gagal') || notice.includes('error') ? '#bf616a' : 'var(--muted)', fontWeight: 800 }}>{notice}</div>}

      <div className={styles.statsPanel}>
        <div>
          <p className="eyebrow">Achievement trend</p>
          <h3>Records by year</h3>
        </div>
        <div className={styles.barChart} aria-label="Achievement records by year">
          {yearlyStats.length === 0 ? (
            <p className={styles.empty}>Belum ada data statistik.</p>
          ) : (
            yearlyStats.map((item) => (
              <div key={item.year} className={styles.barColumn}>
                <span>{item.count}</span>
                <div style={{ height: `${Math.max(18, (item.count / maxYearlyCount) * 96)}px` }} />
                <small>{item.year}</small>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.toolbar}>
        <input
          className="input search"
          type="search"
          placeholder="Search achievement, competition, team, participant..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select className="input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="all">All types</option>
          {typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <select className="input" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="all">All categories</option>
          {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <select className="input" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
          <option value="all">All years</option>
          {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
      </div>

      <article className={`panel ${styles.tablePanel}`}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <button className={styles.sortable} type="button" onClick={() => changeSort('achievementName')}>
                    Achievement Name {sortKey === 'achievementName' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th>
                  <button className={styles.sortable} type="button" onClick={() => changeSort('competitionName')}>
                    Competition {sortKey === 'competitionName' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th>
                  <button className={styles.sortable} type="button" onClick={() => changeSort('date')}>
                    Date {sortKey === 'date' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th>
                  <button className={styles.sortable} type="button" onClick={() => changeSort('type')}>
                    Type {sortKey === 'type' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th>
                  <button className={styles.sortable} type="button" onClick={() => changeSort('teamName')}>
                    Team Name {sortKey === 'teamName' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th>Participants</th>
                <th>
                  <button className={styles.sortable} type="button" onClick={() => changeSort('category')}>
                    Category {sortKey === 'category' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th>Links</th>
                {isEbOrAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {!loading && paginatedRows.map((row) => (
                <tr key={row.rowId}>
                  <td>
                    <div className={styles.nameCell}>
                      <strong>{row.achievementName}</strong>
                    </div>
                  </td>
                  <td>
                    <div className={styles.competitionCell}>
                      <strong>{row.competitionName}</strong>
                    </div>
                  </td>
                  <td>{formatDate(row.date)}</td>
                  <td>
                    <span className={`${styles.typeBadge} ${badgeClassForType(row.type)}`}>
                      {row.type}
                    </span>
                  </td>
                  <td className={styles.participant}>{row.teamName}</td>
                  <td className={styles.participant}>{row.participants.length > 0 ? row.participants.join(', ') : '-'}</td>
                  <td>
                    <span className={`${styles.categoryBadge} ${badgeClassForCategory(row.category)}`}>
                      {row.category}
                    </span>
                  </td>
                  <td>
                    <div className={styles.links}>
                      {row.docsUrl && <a href={normalizeUrl(row.docsUrl)} target="_blank" rel="noreferrer">Docs</a>}
                      {row.tabUrl && <a href={normalizeUrl(row.tabUrl)} target="_blank" rel="noreferrer">TAB</a>}
                    </div>
                  </td>
                  {isEbOrAdmin && (
                    <td>
                      <div className={styles.actionButtons}>
                        {row.source === 'canonical' ? (
                          <>
                            <button className="secondary-button" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handleStartEdit(row.rowId)}>✏️ Edit</button>
                            <button className="danger-button" style={{ padding: '4px 8px', fontSize: '0.8rem', minHeight: 30 }} onClick={() => handleDelete(row.rowId)}>Delete</button>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Legacy Record</span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div className={styles.empty}>Loading achievement records...</div>}
        {!loading && visibleRows.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center', background: 'white' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏆</div>
            <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '8px' }}>Tidak Ada Record Pencapaian</strong>
            <span style={{ color: 'var(--muted)', display: 'block', maxWidth: '400px', margin: '0 auto' }}>
              Belum ada data prestasi yang cocok dengan pencarian atau filter Anda saat ini.
            </span>
          </div>
        )}
        
        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderTop: '1px solid var(--line)' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, visibleRows.length)} of {visibleRows.length} entries
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                className="secondary-button"
                style={{ padding: '6px 12px', minHeight: 'auto', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                Previous
              </button>
              
              <div style={{ display: 'flex', gap: '4px' }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, i, arr) => {
                    // Add ellipsis if gap > 1
                    const showEllipsis = i > 0 && p - arr[i-1] > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: 'var(--muted)' }}>...</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          style={{
                            background: currentPage === p ? 'var(--green)' : 'transparent',
                            color: currentPage === p ? 'white' : 'var(--ink)',
                            border: `1px solid ${currentPage === p ? 'var(--green)' : 'var(--line)'}`,
                            borderRadius: '6px',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.9rem',
                            fontWeight: currentPage === p ? 700 : 500,
                            cursor: 'pointer'
                          }}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages}
                className="secondary-button"
                style={{ padding: '6px 12px', minHeight: 'auto', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </article>

      {showFormModal && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.detailModal}>
            <div className={styles.modalHeader}>
              <h3>{editingResultId ? 'Edit Achievement Record' : 'Add New Achievement Record'}</h3>
              <button type="button" className={styles.closeButton} onClick={() => setShowFormModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className={styles.formGrid}>
              <label className={styles.fullSpan}>
                Competition Name *
                <input 
                  className="input" 
                  value={formCompetitionName} 
                  onChange={(e) => setFormCompetitionName(e.target.value)} 
                  placeholder="e.g. LDBI 2026" 
                  required 
                />
              </label>
              <label>
                Competition Date
                <input 
                  type="date" 
                  className="input" 
                  value={formCompetitionDate} 
                  onChange={(e) => setFormCompetitionDate(e.target.value)} 
                />
              </label>
              <label>
                Category
                <select 
                  className="input" 
                  value={formCategory} 
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  <option>Open</option>
                  <option>Novice</option>
                  <option>ESL</option>
                  <option>Rookie</option>
                  <option>Other</option>
                </select>
              </label>
              <label>
                Format Type
                <select 
                  className="input" 
                  value={formFormatType} 
                  onChange={(e) => setFormFormatType(e.target.value)}
                >
                  <option>Debate - Team</option>
                  <option>Debate - 3on3</option>
                  <option>Debate - 2on2</option>
                  <option>Debate - Individual</option>
                  <option>Adjudicator</option>
                  <option>Speech</option>
                </select>
              </label>
              <label>
                Team Name *
                <input 
                  className="input" 
                  value={formTeamName} 
                  onChange={(e) => setFormTeamName(e.target.value)} 
                  placeholder="e.g. UNDIP A / Individual" 
                  required 
                />
              </label>

              {/* Teammates section */}
              <div className={styles.fullSpan}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Internal Teammates (Registered Members)</label>
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
                            if (!p.id) return false;
                            if (formInternalTeammates.includes(p.id)) return false;
                            return Boolean(p.name?.toLowerCase().includes(teammateSearch.toLowerCase()));
                          })
                          .map(p => (
                            <div 
                              key={p.id} 
                              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--line)', color: 'var(--ink)' }}
                              onMouseDown={() => {
                                setFormInternalTeammates(current => [...current, p.id]);
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
                {formInternalTeammates.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {formInternalTeammates.map(id => {
                      const p = allProfiles.find(x => x.id === id);
                      return (
                        <span key={id} className="rank-badge" style={{ gap: 6, display: 'inline-flex', alignItems: 'center' }}>
                          {p?.name} 
                          <button 
                            type="button" 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }} 
                            onClick={() => setFormInternalTeammates(current => current.filter(x => x !== id))}
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <label className={styles.fullSpan}>
                External / Unregistered Teammates (Comma Separated)
                <input 
                  className="input" 
                  value={formExternalTeammates} 
                  onChange={(e) => setFormExternalTeammates(e.target.value)} 
                  placeholder="e.g. John Doe, Jane Smith" 
                />
              </label>

              <label>
                Role
                <input 
                  className="input" 
                  value={formRole} 
                  onChange={(e) => setFormRole(e.target.value)} 
                  placeholder="Speaker / Adjudicator / Coach" 
                />
              </label>
              
              <label>
                TAB Link
                <input 
                  className="input" 
                  value={formTabUrl} 
                  onChange={(e) => setFormTabUrl(e.target.value)} 
                  placeholder="https://..."
                />
              </label>

              <div className={styles.fullSpan} style={{ margin: '8px 0' }}>
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={formIsAchievement} 
                    onChange={(e) => setFormIsAchievement(e.target.checked)} 
                  />
                  Is UDF Achievement Record?
                </label>
              </div>

              {formIsAchievement && (
                <>
                  <label className={styles.fullSpan}>
                    Achievement Name *
                    <input 
                      className="input" 
                      value={formAchievementName} 
                      onChange={(e) => setFormAchievementName(e.target.value)} 
                      placeholder="e.g. Champion, 1st Runner Up, Finalist, Best Speaker" 
                      required 
                    />
                  </label>
                  <label className={styles.fullSpan}>
                    Documentation Link
                    <input 
                      className="input" 
                      value={formDocumentationUrl} 
                      onChange={(e) => setFormDocumentationUrl(e.target.value)} 
                      placeholder="https://..."
                    />
                  </label>
                </>
              )}

              <div className={styles.fullSpan} style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                <button type="button" className="secondary-button" onClick={() => setShowFormModal(false)}>Cancel</button>
                <button type="submit" className="primary-button" disabled={savingRecord}>
                  {savingRecord ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
