'use client';

import { useMemo, useState } from 'react';
import styles from './ProfileDirectory.module.css';

type DiscordRole = { name: string; color: string };
type Achievement = {
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

export type ProfileRow = {
  id: string;
  name?: string;
  bio?: string;
  caption?: string;
  profile_picture_url?: string;
  header_picture_url?: string;
  avatar_color?: string;
  avatar_initials?: string;
  discord_roles?: DiscordRole[];
  achievements?: Achievement[];
  debating_history?: unknown[];
  contact_links?: { whatsapp?: string; website?: string };
  speaker_role?: string;
  tags?: string[];
};

function initials(name?: string, fallback?: string) {
  if (fallback) return fallback;
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

function getUdfBatch(profile: ProfileRow) {
  return profile.discord_roles?.find((role) => /^UDF\d+/i.test(role.name))?.name || 'UDF Member';
}

function getSpeakerRole(profile: ProfileRow) {
  if (profile.speaker_role) return profile.speaker_role;
  const roleNames = profile.discord_roles?.map((role) => role.name).join(', ') || '';
  if (/coach/i.test(roleNames)) return 'Coach / Mentor';
  if (/adjudicator/i.test(roleNames)) return 'Adjudicator';
  if (/speaker|varsity|open|novice/i.test(roleNames)) return 'Debater / Speaker';
  return 'Debater';
}

function getPreviewTags(profile: ProfileRow) {
  if (profile.tags && profile.tags.length > 0) return profile.tags.slice(0, 3);
  const roles = profile.discord_roles || [];
  return roles
    .map((role) => role.name)
    .filter((name) => !/^UDF\d+/i.test(name) && !/^(EB|Admin)$/i.test(name))
    .slice(0, 3);
}

function normalizeHistory(history: unknown[]) {
  return history
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      return {
        title: String(record.title || record.name || record.competition || 'Debate record'),
        description: String(record.description || record.result || record.role || ''),
        date: String(record.date || record.year || ''),
        tab_url: String(record.tab_url || record.tab || record.link || ''),
      };
    })
    .filter(Boolean) as Array<{ title: string; description: string; date: string; tab_url: string }>;
}

function normalizeUrl(value?: string) {
  if (!value) return '';
  const cleaned = value.trim();
  if (!cleaned) return '';
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://${cleaned}`;
}

function whatsappUrl(value?: string) {
  if (!value) return '';
  const cleaned = value.trim();
  if (!cleaned) return '';
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  const digits = cleaned.replace(/[^\d]/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits.startsWith('0') ? `62${digits.slice(1)}` : digits}`;
}

export default function ProfileDirectory({ profiles }: { profiles: ProfileRow[] }) {
  const [selectedProfile, setSelectedProfile] = useState<ProfileRow | null>(null);

  const selectedRoles = selectedProfile?.discord_roles || [];
  const selectedAchievements = selectedProfile?.achievements || [];
  const selectedHistory = useMemo(() => normalizeHistory(selectedProfile?.debating_history || []), [selectedProfile]);
  const selectedContacts = selectedProfile?.contact_links || {};
  const selectedWhatsapp = whatsappUrl(selectedContacts.whatsapp);
  const selectedWebsite = normalizeUrl(selectedContacts.website);

  function openProfile(profile: ProfileRow) {
    setSelectedProfile(profile);
  }

  return (
    <>
      <div className={styles.directoryGrid}>
        {profiles.length > 0 ? profiles.map((profile) => (
          <button key={profile.id} className={styles.profilePreview} type="button" onClick={() => openProfile(profile)}>
            <div className={styles.previewBody}>
              <div className={styles.previewHeader} style={profile.header_picture_url ? {
                backgroundImage: `url('${profile.header_picture_url}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } : undefined}>
                <div className={styles.previewAvatarWrap}>
                  {profile.profile_picture_url ? (
                    <img src={profile.profile_picture_url} alt={profile.name || 'Profile'} />
                  ) : (
                    <span>{initials(profile.name, profile.avatar_initials)}</span>
                  )}
                </div>
              </div>
              <h3>{profile.name || 'Anonymous User'}</h3>
              <p>{profile.caption || profile.bio || 'Undip Debate Forum member'}</p>
              <div className={styles.previewTagRow}>
                {getPreviewTags(profile).length > 0 ? getPreviewTags(profile).map((tag) => (
                  <span key={tag}>{tag}</span>
                )) : (
                  <>
                    <span>{getUdfBatch(profile)}</span>
                    <span>{getSpeakerRole(profile)}</span>
                  </>
                )}
              </div>
            </div>
          </button>
        )) : (
          <p>No profiles found. Run the SQL script to insert some dummy data.</p>
        )}
      </div>

      {selectedProfile && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label={`${selectedProfile.name || 'Member'} profile`}>
          <article className={styles.detailModal}>
            <button className={styles.closeButton} type="button" onClick={() => setSelectedProfile(null)} aria-label="Close profile">x</button>
            <div className={styles.heroCard}>
              <div className={styles.heroCover} style={selectedProfile.header_picture_url ? {
                backgroundImage: `url('${selectedProfile.header_picture_url}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } : undefined}>
                {!selectedProfile.header_picture_url && <span>UDF member profile</span>}
              </div>
              <div className={styles.heroIntro}>
                <div className={styles.heroAvatarWrap}>
                  {selectedProfile.profile_picture_url ? (
                    <img src={selectedProfile.profile_picture_url} alt={selectedProfile.name || 'Profile'} className={styles.heroAvatarImage} />
                  ) : (
                    <div className={styles.heroAvatarFallback}>{initials(selectedProfile.name, selectedProfile.avatar_initials)}</div>
                  )}
                </div>
                <div className={styles.heroInfo}>
                  <h2>{selectedProfile.name || 'Anonymous User'}</h2>
                  <p className={styles.heroCaption}>{selectedProfile.caption || 'Undip Debate Forum member'}</p>
                  <p className={styles.heroBio}>{selectedProfile.bio || 'No bio provided yet.'}</p>
                  <div className={styles.roleStrip}>
                    {selectedRoles.length > 0 ? selectedRoles.map((role) => (
                      <span key={role.name} style={{ background: `${role.color}24`, color: role.color }}>{role.name}</span>
                    )) : <span>Member</span>}
                  </div>
                </div>
              </div>
              <div className={styles.profileFacts}>
                <span>{getUdfBatch(selectedProfile)}</span>
                <span>{getSpeakerRole(selectedProfile)}</span>
                <span>{selectedAchievements.length} achievements</span>
              </div>
            </div>

            <div className={styles.detailContent}>
              <section>
                <h3>About</h3>
                <p>{selectedProfile.bio || 'No bio provided yet.'}</p>
              </section>

              <section>
                <h3>Speaker Role</h3>
                <p>{getSpeakerRole(selectedProfile)}</p>
              </section>

              <section>
                <h3>Contact Information</h3>
                {selectedWhatsapp || selectedWebsite ? (
                  <div className={styles.contactLinks}>
                    {selectedWhatsapp && <a href={selectedWhatsapp} target="_blank" rel="noreferrer">WhatsApp</a>}
                    {selectedWebsite && <a href={selectedWebsite} target="_blank" rel="noreferrer">Website</a>}
                  </div>
                ) : (
                  <p>No contact information provided yet.</p>
                )}
              </section>

              <section>
                <h3>Debate Competition History & Achievements</h3>
                {selectedAchievements.length > 0 || selectedHistory.length > 0 ? (
                  <div className={styles.timelineList}>
                    {selectedAchievements.map((achievement, index) => (
                      <div key={achievement.id || index} className={styles.timelineItem}>
                        <strong>{achievement.name || 'Achievement'}</strong>
                        <span>{achievement.competition || 'Competition'} {achievement.date && `- ${achievement.date}`}</span>
                        <p>{achievement.type || 'Debate'} / {achievement.category || 'Open'} / {achievement.participant || 'Participant'}</p>
                        <div className={styles.linkRow}>
                          {achievement.documentation && <a href={normalizeUrl(achievement.documentation)} target="_blank" rel="noreferrer">View Documentation</a>}
                          {achievement.tab_url && <a href={normalizeUrl(achievement.tab_url)} target="_blank" rel="noreferrer">View TAB</a>}
                        </div>
                      </div>
                    ))}
                    {selectedHistory.map((record, index) => (
                      <div key={`${record.title}-${index}`} className={styles.timelineItem}>
                        <strong>{record.title}</strong>
                        {record.date && <span>{record.date}</span>}
                        {record.description && <p>{record.description}</p>}
                        {record.tab_url && <a href={normalizeUrl(record.tab_url)} target="_blank" rel="noreferrer">View TAB</a>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No debate records listed yet.</p>
                )}
              </section>
            </div>
          </article>
        </div>
      )}
    </>
  );
}
