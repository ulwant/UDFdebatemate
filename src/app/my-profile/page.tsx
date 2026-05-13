'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import styles from './MyProfile.module.css';

// Image resize utility
async function resizeImage(file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, 'image/jpeg', quality);
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

const PREDEFINED_ROLES = [
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

type DiscordRole = {
  id?: string;
  name: string;
  color: string;
};

type Profile = {
  id?: string;
  user_id?: string;
  name: string;
  bio: string;
  caption: string;
  profile_picture_url: string;
  header_picture_url?: string;
  avatar_initials?: string;
  avatar_color: string;
  system_role?: string;
  discord_roles: DiscordRole[];
  contact_links: { whatsapp?: string; website?: string };
  achievements: Achievement[];
  debating_history: unknown[];
};

type Achievement = {
  id?: string;
  name: string;
  competition: string;
  date: string;
  type: string;
  participant: string;
  category: string;
  documentation: string;
  tab_url: string;
};

type Motion = {
  id: string;
  competition?: string | null;
  year?: string | number | null;
  text: string;
  motion_type?: string | null;
  tab_url?: string | null;
};

type BookmarkRow = {
  motions: Motion | Motion[] | null;
};

const emptyProfile: Profile = {
  name: '',
  bio: '',
  caption: '',
  profile_picture_url: '',
  avatar_color: 'blue',
  discord_roles: [],
  contact_links: { whatsapp: '', website: '' },
  achievements: [],
  debating_history: [],
};

function getInitials(name?: string) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

function normalizeBookmarkedMotion(bookmark: BookmarkRow) {
  if (Array.isArray(bookmark.motions)) return bookmark.motions[0] || null;
  return bookmark.motions;
}

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
  const [attendanceMessage, setAttendanceMessage] = useState('');
  const [roleOptions, setRoleOptions] = useState<DiscordRole[]>(PREDEFINED_ROLES);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#175b45');
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState('');
  const [editingRoleColor, setEditingRoleColor] = useState('#175b45');

  const isEb = profile.system_role === 'eb' || profile.system_role === 'admin';

  useEffect(() => {
    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      setUser({ id: session.user.id, email: session.user.email });
      await Promise.all([
        fetchProfile(session.user.id),
        fetchBookmarks(session.user.id),
        fetchRoleOptions(),
      ]);
      setLoading(false);
    }

    loadSession();
  }, [router]);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) {
      setProfile({
        ...emptyProfile,
        ...data,
        discord_roles: data.discord_roles || [],
        contact_links: data.contact_links || { whatsapp: '', website: '' },
        achievements: data.achievements || [],
        debating_history: data.debating_history || [],
      });
    } else {
      setEditMode(true);
    }
  }

  async function fetchRoleOptions() {
    const { data, error } = await supabase
      .from('discord_roles')
      .select('id, name, color')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      setRoleOptions(PREDEFINED_ROLES);
      return;
    }

    const mergedMap = new Map<string, DiscordRole>();
    PREDEFINED_ROLES.forEach((role) => {
      mergedMap.set(role.name.toLowerCase(), role);
    });
    (data as DiscordRole[]).forEach((role) => {
      mergedMap.set(role.name.toLowerCase(), role);
    });
    const merged = Array.from(mergedMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    setRoleOptions(merged);
  }

  async function fetchBookmarks(userId: string) {
    const { data } = await supabase
      .from('bookmarks')
      .select(`
        motion_id,
        motions (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) {
      setBookmarkedMotions(
        (data as unknown as BookmarkRow[])
          .map(normalizeBookmarkedMotion)
          .filter((motion): motion is Motion => Boolean(motion)),
      );
    }
  }

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setAttendanceMessage('File avatar harus berupa gambar.');
      return;
    }

    setUploadingAvatar(true);
    
    try {
      // Resize image before upload
      const resizedBlob = await resizeImage(file, 800, 800, 0.8);
      const extension = 'jpg';
      const safeName = `${Date.now()}.${extension}`;
      const filePath = `${user.id}/${safeName}`;

      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, resizedBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (error) {
        setAttendanceMessage(`Upload avatar gagal: ${error.message}`);
        setUploadingAvatar(false);
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setProfile((current) => ({ ...current, profile_picture_url: data.publicUrl }));
      setAttendanceMessage('Avatar berhasil di-upload dan otomatis di-resize. Jangan lupa klik Save Profile.');
      setUploadingAvatar(false);
    } catch (err) {
      setAttendanceMessage(`Error: ${err instanceof Error ? err.message : 'Upload gagal'}`);
      setUploadingAvatar(false);
    }
  }

  async function handleHeaderUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setAttendanceMessage('File header harus berupa gambar.');
      return;
    }

    setUploadingHeader(true);
    
    try {
      const resizedBlob = await resizeImage(file, 1200, 400, 0.85);
      const extension = 'jpg';
      const safeName = `header_${Date.now()}.${extension}`;
      const filePath = `${user.id}/${safeName}`;

      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, resizedBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (error) {
        setAttendanceMessage(`Upload header gagal: ${error.message}`);
        setUploadingHeader(false);
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setProfile((current) => ({ ...current, header_picture_url: data.publicUrl }));
      setAttendanceMessage('Header berhasil di-upload. Jangan lupa klik Save Profile.');
      setUploadingHeader(false);
    } catch (err) {
      setAttendanceMessage(`Error: ${err instanceof Error ? err.message : 'Upload gagal'}`);
      setUploadingHeader(false);
    }
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      name: profile.name,
      bio: profile.bio,
      caption: profile.caption,
      avatar_initials: getInitials(profile.name),
      avatar_color: profile.avatar_color,
      profile_picture_url: profile.profile_picture_url,
      header_picture_url: profile.header_picture_url,
      discord_roles: profile.discord_roles,
      contact_links: profile.contact_links,
      achievements: profile.achievements,
      debating_history: profile.debating_history,
    };

    if (profile.id) {
      await supabase.from('profiles').update(payload).eq('id', profile.id);
    } else {
      const { data } = await supabase.from('profiles').insert([payload]).select().single();
      if (data) setProfile({ ...profile, ...data });
    }

    setSaving(false);
    setEditMode(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  // Define restricted role names
  const RESTRICTED_ROLES = ['admin', 'eb', 'udf24', 'udf23', 'udf25', 'members', 'coach', 'mentor'];

  function addRole(roleName: string) {
    const roleDef = roleOptions.find((role) => role.name === roleName);
    if (!roleDef || profile.discord_roles?.find((role) => role.name === roleName)) return;
    
    // Prevent adding restricted roles via UI
    if (!isEb && RESTRICTED_ROLES.some(r => roleName.toLowerCase().includes(r))) {
      setAttendanceMessage('Anda tidak dapat memilih role ini secara mandiri.');
      return;
    }
    
    setProfile({ ...profile, discord_roles: [...(profile.discord_roles || []), roleDef] });
  }

  function removeRole(index: number) {
    const roleToRemove = profile.discord_roles?.[index];
    if (!roleToRemove) return;

    if (!isEb && RESTRICTED_ROLES.some(r => roleToRemove.name.toLowerCase().includes(r))) {
      setAttendanceMessage('Anda tidak dapat menghapus role khusus ini secara mandiri.');
      return;
    }

    const newRoles = [...(profile.discord_roles || [])];
    newRoles.splice(index, 1);
    setProfile({ ...profile, discord_roles: newRoles });
  }

  function addRecord() {
    setProfile({
      ...profile,
      achievements: [...(profile.achievements || []), {
        id: Date.now().toString(),
        name: '',
        competition: '',
        date: '',
        type: 'Debate - Team',
        participant: '',
        category: 'Open',
        documentation: '',
        tab_url: '',
      }],
    });
  }

  function updateRecord(index: number, field: keyof Achievement, value: string) {
    const newAchievements = [...(profile.achievements || [])];
    newAchievements[index] = { ...newAchievements[index], [field]: value };
    setProfile({ ...profile, achievements: newAchievements });
  }

  function removeRecord(index: number) {
    const newAchievements = [...(profile.achievements || [])];
    newAchievements.splice(index, 1);
    setProfile({ ...profile, achievements: newAchievements });
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <section className="section active-section" style={{ display: 'block' }}>
      <div className={styles.pageHeader}>
        <div>
          <p className="eyebrow">My Account</p>
          <h2>Personal Dashboard</h2>
        </div>
        <div className={styles.actionRow}>
          {editMode ? (
            <button className="primary-button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          ) : (
            <button className="secondary-button" onClick={() => setEditMode(true)}>Edit Profile</button>
          )}
          <button className="ghost-button" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <article className={`${styles.linkedInCard} panel`}>
        <div 
          className={styles.cover} 
          style={profile.header_picture_url ? { backgroundImage: `url(${profile.header_picture_url})` } : undefined}
        >
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
              {profile.discord_roles?.length > 0 ? profile.discord_roles.map((role, index) => (
                <span key={`${role.name}-${index}`} className="rank-badge" style={{ background: `${role.color}22`, color: role.color, borderColor: `${role.color}44` }}>
                  {role.name}
                </span>
              )) : (
                <span className="rank-badge">Member</span>
              )}
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
            <label>
              Full Name
              <input className="input" value={profile.name || ''} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />
            </label>
            <label>
              Caption
              <input className="input" value={profile.caption || ''} onChange={(event) => setProfile({ ...profile, caption: event.target.value })} />
            </label>
            <label className={styles.fullSpan}>
              Full Bio
              <textarea className="input" value={profile.bio || ''} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} rows={3} />
            </label>
            <div className={styles.fullSpan}>
              <label>Discord Roles</label>
              <div className={styles.roleEditor}>
                {profile.discord_roles?.map((role, index) => (
                  <span key={`${role.name}-${index}`} className="rank-badge" style={{ background: `${role.color}22`, color: role.color, borderColor: `${role.color}44` }}>
                    {role.name}
                    <button onClick={() => removeRole(index)} type="button" aria-label={`Remove ${role.name}`}>x</button>
                  </span>
                ))}
                <select
                  className="input"
                  onChange={(event) => {
                    if (event.target.value) addRole(event.target.value);
                    event.target.value = '';
                  }}
                >
                  <option value="">+ Add Role</option>
                  {roleOptions.filter((role) => {
                    const isSelected = profile.discord_roles?.find((selected) => selected.name === role.name);
                    const isRestricted = RESTRICTED_ROLES.some(r => role.name.toLowerCase().includes(r));
                    // Hide restricted roles from selection dropdown for members
                    if (!isEb && isRestricted) return false;
                    return !isSelected;
                  }).map((role) => (
                    <option key={role.name} value={role.name}>{role.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <label>
              WhatsApp
              <input className="input" value={profile.contact_links?.whatsapp || ''} onChange={(event) => setProfile({ ...profile, contact_links: { ...profile.contact_links, whatsapp: event.target.value } })} />
            </label>
            <label>
              Website
              <input className="input" value={profile.contact_links?.website || ''} onChange={(event) => setProfile({ ...profile, contact_links: { ...profile.contact_links, website: event.target.value } })} />
            </label>
          </div>
        )}
      </article>

      {attendanceMessage && <div className={styles.notice}>{attendanceMessage}</div>}

      <div className="two-column">
        <article className="panel">
          <div className="panel-header">
            <h3>Debating Records & Achievements</h3>
            {editMode && <button className="secondary-button" onClick={addRecord}>+ Add Record</button>}
          </div>

          {editMode ? (
            <div className={styles.recordEditor}>
              {profile.achievements?.length === 0 && <p className={styles.emptyState}>No records yet. Click Add Record to insert your debating history.</p>}
              {profile.achievements?.map((achievement, index) => (
                <div key={achievement.id || index} className={styles.recordForm}>
                  <label>Achievement<input className="input" value={achievement.name} onChange={(event) => updateRecord(index, 'name', event.target.value)} /></label>
                  <label>Competition<input className="input" value={achievement.competition} onChange={(event) => updateRecord(index, 'competition', event.target.value)} /></label>
                  <label>Date<input type="date" className="input" value={achievement.date} onChange={(event) => updateRecord(index, 'date', event.target.value)} /></label>
                  <label>Type<select className="input" value={achievement.type} onChange={(event) => updateRecord(index, 'type', event.target.value)}><option>Debate - Team</option><option>Debate - Individual</option><option>Adjudicator</option></select></label>
                  <label>Category<select className="input" value={achievement.category} onChange={(event) => updateRecord(index, 'category', event.target.value)}><option>Open</option><option>Novice</option></select></label>
                  <label>Team / Participant<input className="input" value={achievement.participant} onChange={(event) => updateRecord(index, 'participant', event.target.value)} /></label>
                  <label className={styles.fullSpan}>Documentation<input className="input" value={achievement.documentation} onChange={(event) => updateRecord(index, 'documentation', event.target.value)} /></label>
                  <label className={styles.fullSpan}>TAB Link<input className="input" value={achievement.tab_url || ''} onChange={(event) => updateRecord(index, 'tab_url', event.target.value)} /></label>
                  <button onClick={() => removeRecord(index)} className="ghost-button" type="button">Remove Record</button>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.achievementList}>
              {profile.achievements?.length > 0 ? profile.achievements.map((achievement, index) => (
                <div key={achievement.id || index} className={styles.achievementCard}>
                  <strong>{achievement.name}</strong>
                  <span>{achievement.date}</span>
                  <p>{achievement.competition}</p>
                  <small>{achievement.type} / {achievement.category} / {achievement.participant}</small>
                  {achievement.documentation && <a href={achievement.documentation} target="_blank" rel="noreferrer">View Documentation</a>}
                  {achievement.tab_url && <a href={achievement.tab_url} target="_blank" rel="noreferrer">View TAB</a>}
                </div>
              )) : (
                <p className={styles.emptyState}>No records yet.</p>
              )}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-header">
            <h3>Bookmarked Motions</h3>
          </div>
          {bookmarkedMotions.length === 0 ? (
            <p className={styles.emptyState}>You have not bookmarked any motions yet.</p>
          ) : (
            <div className={styles.bookmarkList}>
              {bookmarkedMotions.map((motion) => (
                <div key={motion.id} className={styles.bookmarkCard}>
                  <h4>{motion.competition ? `${motion.competition} ${motion.year || ''}` : 'Independent Motion'}</h4>
                  <strong>{motion.text}</strong>
                  <span>Round 1 {motion.motion_type && `/ ${motion.motion_type}`}</span>
                  {motion.tab_url && <a href={motion.tab_url} target="_blank" rel="noreferrer">View Tab</a>}
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
