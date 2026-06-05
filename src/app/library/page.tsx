'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { notifyApprovedMembers } from '@/lib/notifications';
import { MOTION_TYPES, PRIMARY_TOPICS, SECONDARY_TOPICS } from '@/lib/constants';
import { useToast } from '@/app/components/ToastContext';
import { motionDraftToPayload, submitMotionForReview } from '@/lib/data/motions';

type SessionUser = { id: string };
type AuthSession = { user: SessionUser } | null;
type Motion = {
  id: string;
  text: string;
  motion_type?: string;
  primary_category?: string;
  secondary_category?: string;
  competition?: string;
  year?: string | number;
  tab_url?: string;
};
type Bookmark = { motion_id: string };
type MotionSubmission = {
  id: string;
  submitted_by: string;
  draft: {
    text?: string;
    motion_type?: string;
    primary_category?: string;
    secondary_category?: string;
    competition?: string;
    year?: number | null;
    tab_url?: string | null;
  };
  status: 'pending' | 'approved' | 'rejected';
  review_note?: string | null;
  created_at: string;
};

export default function LibraryPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [motions, setMotions] = useState<Motion[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession>(null);
  const [userRole, setUserRole] = useState<string>('member');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newMotion, setNewMotion] = useState({
    text: '',
    motion_type: '',
    primary_categories: [] as string[],
    secondary_categories: [] as string[],
    competition: '',
    year: new Date().getFullYear().toString(),
    tab_url: ''
  });

  const [bookmarkedMotions, setBookmarkedMotions] = useState<Set<string>>(new Set());
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [editingMotion, setEditingMotion] = useState<Motion | null>(null);
  const [pendingSubmissions, setPendingSubmissions] = useState<MotionSubmission[]>([]);
  const [visibleCount, setVisibleCount] = useState(15);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    addToast({ title: type === 'error' ? 'Library Error' : type === 'success' ? 'Library Updated' : 'Motion Bank', message, type });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = () => setActiveDropdown(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  async function fetchMotions() {
    setLoading(true);
    let query = supabase.from('motions').select('*').order('created_at', { ascending: false });

    if (searchQuery) query = query.ilike('text', `%${searchQuery}%`);
    if (typeFilter) query = query.eq('motion_type', typeFilter);

    const { data } = await query;
    if (data) setMotions(data as Motion[]);

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session) {
      const { data: bData } = await supabase.from('bookmarks').select('motion_id').eq('user_id', sessionData.session.user.id);
      if (bData) setBookmarkedMotions(new Set((bData as Bookmark[]).map((b) => b.motion_id)));
    }

    setLoading(false);
  }

  async function fetchMotionSubmissions() {
    if (userRole === 'member') return;
    const { data, error } = await supabase
      .from('motion_submissions')
      .select('id, submitted_by, draft, status, review_note, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      if (!error.message.toLowerCase().includes('does not exist')) {
        notify(`Failed to load motion submissions: ${error.message}`, 'error');
      }
      return;
    }

    setPendingSubmissions((data || []) as MotionSubmission[]);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession((data.session as AuthSession) || null);
      if (data.session) {
        supabase.from('profiles').select('system_role').eq('user_id', data.session.user.id).single()
          .then(({ data: profileData }) => {
            if (profileData) setUserRole(profileData.system_role);
          });
      }
    });
    const initialLoadTimer = window.setTimeout(() => {
      void fetchMotions();
    }, 0);
    return () => window.clearTimeout(initialLoadTimer);
  }, [typeFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchMotionSubmissions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [userRole]);

  // Client-side debounce for search text
  useEffect(() => {
    setVisibleCount(15); // Reset pagination on search
    const handler = setTimeout(() => {
      void fetchMotions();
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset pagination on filter changes
  useEffect(() => {
    setVisibleCount(15);
  }, [typeFilter, selectedTopics]);

  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const filteredMotions = motions.filter(m => {
    if (selectedTopics.length === 0) return true;
    const mPrimary = m.primary_category ? m.primary_category.split(', ') : [];
    const mSecondary = m.secondary_category ? m.secondary_category.split(', ') : [];
    const allTags = [...mPrimary, ...mSecondary];
    return selectedTopics.every(topic => allTags.includes(topic));
  });

  const handleAddClick = () => {
    if (!session) {
      notify('Please login to your account to add a new motion.', 'error');
      router.push('/login');
      return;
    }
    setEditingMotion(null);
    setShowModal(true);
  };

  const handleEditClick = (motion: Motion) => {
    if (!session) {
      notify('Please login to edit a motion.', 'error');
      router.push('/login');
      return;
    }
    const primary = motion.primary_category ? motion.primary_category.split(', ') : [];
    const secondary = motion.secondary_category ? motion.secondary_category.split(', ') : [];
    setEditingMotion(motion);
    setNewMotion({
      text: motion.text,
      motion_type: motion.motion_type || '',
      primary_categories: primary,
      secondary_categories: secondary,
      competition: motion.competition || '',
      year: motion.year ? motion.year.toString() : new Date().getFullYear().toString(),
      tab_url: motion.tab_url || ''
    });
    setShowModal(true);
    setActiveDropdown(null);
  };

  const toggleBookmark = async (motionId: string) => {
    if (!session) {
      notify('Please login to bookmark motions.', 'error');
      router.push('/login');
      return;
    }
    const isBookmarked = bookmarkedMotions.has(motionId);
    if (isBookmarked) {
      const { error } = await supabase.from('bookmarks').delete().match({ user_id: session.user.id, motion_id: motionId });
      if (error) {
        notify(`Failed to remove bookmark: ${error.message}. Pastikan supabase_bookmarks_update.sql sudah dijalankan.`, 'error');
        return;
      }
      const newBookmarks = new Set(bookmarkedMotions);
      newBookmarks.delete(motionId);
      setBookmarkedMotions(newBookmarks);
    } else {
      const { error } = await supabase.from('bookmarks').insert({ user_id: session.user.id, motion_id: motionId });
      if (error) {
        notify(`Failed to add bookmark: ${error.message}. Pastikan supabase_bookmarks_update.sql sudah dijalankan.`, 'error');
        return;
      }
      const newBookmarks = new Set(bookmarkedMotions);
      newBookmarks.add(motionId);
      setBookmarkedMotions(newBookmarks);
    }
  };

  const copyMotionText = (text: string) => {
    navigator.clipboard.writeText(text);
    notify('Motion text copied to clipboard.', 'success');
  };

  const reportMotion = () => {
    notify('Thank you for reporting. Our admins will review this motion.', 'success');
  };

  const handleSaveMotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMotion.text || !newMotion.motion_type) {
      notify('Text and Motion Type are required.', 'error');
      return;
    }
    if (!session) {
      notify('Please log in before saving a motion.', 'error');
      return;
    }

    setSaving(true);
    const payload = motionDraftToPayload(newMotion);

    try {
      if (editingMotion) {
        // Update existing motion
        const { error } = await supabase.from('motions').update(payload).eq('id', editingMotion.id);
        if (error) {
          notify(`Failed to update motion: ${error.message}`, 'error');
        } else {
          await notifyApprovedMembers({
            title: 'Library Updated',
            message: `Motion "${newMotion.text.slice(0, 80)}${newMotion.text.length > 80 ? '...' : ''}" diupdate di library.`,
            link: '/library',
            type: 'library',
          });
          setShowModal(false);
          setEditingMotion(null);
          setNewMotion({
            text: '', motion_type: '', primary_categories: [], secondary_categories: [], competition: '', year: new Date().getFullYear().toString(), tab_url: ''
          });
          notify('Motion updated successfully.', 'success');
          fetchMotions(); // Refresh list
        }
      } else if (userRole === 'member') {
        const { error } = await submitMotionForReview(session.user.id, newMotion);
        if (error) {
          notify(`Failed to submit motion for review: ${error.message}. Pastikan supabase_motion_submissions.sql sudah dijalankan.`, 'error');
        } else {
          notify('Motion submitted for EB/Admin review.', 'success');
          setShowModal(false);
          setNewMotion({
            text: '', motion_type: '', primary_categories: [], secondary_categories: [], competition: '', year: new Date().getFullYear().toString(), tab_url: ''
          });
        }
      } else {
        // Create new motion
        const { error } = await supabase.from('motions').insert([{ ...payload, created_by: session.user.id }]);
        if (error) {
          notify(`Failed to add motion: ${error.message}`, 'error');
        } else {
          await notifyApprovedMembers({
            title: 'Library Updated',
            message: `Motion baru ditambahkan ke library: "${newMotion.text.slice(0, 80)}${newMotion.text.length > 80 ? '...' : ''}"`,
            link: '/library',
            type: 'library',
          });
          setShowModal(false);
          setNewMotion({
            text: '', motion_type: '', primary_categories: [], secondary_categories: [], competition: '', year: new Date().getFullYear().toString(), tab_url: ''
          });
          notify('Motion submitted successfully.', 'success');
          fetchMotions(); // Refresh list
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteMotion = async (motion: Motion) => {
    if (userRole === 'member') return;
    if (!window.confirm('Hapus motion ini dari Motion Bank?')) return;
    const { error } = await supabase.from('motions').delete().eq('id', motion.id);
    if (error) {
      notify(`Failed to delete motion: ${error.message}`, 'error');
      return;
    }
    notify('Motion deleted.', 'success');
    setActiveDropdown(null);
    await fetchMotions();
  };

  async function reviewMotionSubmission(submission: MotionSubmission, nextStatus: 'approved' | 'rejected') {
    if (nextStatus === 'approved') {
      const { error: insertError } = await supabase.from('motions').insert({
        text: submission.draft.text || '',
        motion_type: submission.draft.motion_type || '',
        primary_category: submission.draft.primary_category || '',
        secondary_category: submission.draft.secondary_category || '',
        competition: submission.draft.competition || '',
        year: submission.draft.year || null,
        tab_url: submission.draft.tab_url || null,
        created_by: submission.submitted_by,
      });

      if (insertError) {
        notify(`Failed to publish submission: ${insertError.message}`, 'error');
        return;
      }
    }

    const { error } = await supabase
      .from('motion_submissions')
      .update({
        status: nextStatus,
        reviewed_at: new Date().toISOString(),
        review_note: nextStatus === 'approved' ? 'Approved into Motion Bank.' : 'Rejected by EB/Admin.',
      })
      .eq('id', submission.id);

    if (error) {
      notify(`Failed to update submission: ${error.message}`, 'error');
      return;
    }

    notify(nextStatus === 'approved' ? 'Motion submission approved.' : 'Motion submission rejected.', 'success');
    await Promise.all([fetchMotionSubmissions(), fetchMotions()]);
  }

  return (
    <section id="library" className="section active-section" style={{ display: 'block', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Motion Bank</h2>
        {session && (
          <button className="primary-button" onClick={handleAddClick} style={{ borderRadius: '6px', padding: '10px 16px', fontWeight: 600 }}>
            Submit Motion
          </button>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media (max-width: 980px) {
          .library-layout {
            flex-direction: column !important;
          }
          .library-sidebar {
            flex: 1 1 auto !important;
            width: 100% !important;
          }
        }
      `}} />

      <div className="library-layout" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

        {/* Left Sidebar: Filters */}
        <div className="library-sidebar" style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <input
            className="input search"
            type="search"
            placeholder="Search motion text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '12px', fontSize: '1rem', borderRadius: '8px', background: 'var(--panel)', border: '1px solid var(--line)' }}
          />

          {/* Motion Types Filter */}
          <div style={{ background: 'var(--paper)', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, color: 'var(--ink)', fontSize: '1.05rem' }}>Motion Types</h4>
              <button onClick={() => setTypeFilter('')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.9rem' }}>All</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {MOTION_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t === typeFilter ? '' : t)}
                  style={{
                    background: typeFilter === t ? 'var(--green)' : 'transparent',
                    color: typeFilter === t ? 'white' : 'var(--ink)',
                    border: `1px solid ${typeFilter === t ? 'var(--green)' : 'var(--line)'}`,
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Topics Filter */}
          <div style={{ background: 'var(--paper)', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, color: 'var(--ink)', fontSize: '1.05rem' }}>Primary Topics</h4>
              <button onClick={() => setSelectedTopics(selectedTopics.filter(t => !PRIMARY_TOPICS.includes(t)))} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.9rem' }}>Clear</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
              {PRIMARY_TOPICS.map(t => {
                const isActive = selectedTopics.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTopic(t)}
                    style={{
                      background: isActive ? 'var(--green)' : 'transparent',
                      color: isActive ? 'white' : 'var(--ink)',
                      border: `1px solid ${isActive ? 'var(--green)' : 'var(--line)'}`,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Secondary Topics Filter */}
          <div style={{ background: 'var(--paper)', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, color: 'var(--ink)', fontSize: '1.05rem' }}>Secondary Topics</h4>
              <button onClick={() => setSelectedTopics(selectedTopics.filter(t => !SECONDARY_TOPICS.includes(t)))} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.9rem' }}>Clear</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
              {SECONDARY_TOPICS.map(t => {
                const isActive = selectedTopics.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTopic(t)}
                    style={{
                      background: isActive ? 'var(--green)' : 'transparent',
                      color: isActive ? 'white' : 'var(--ink)',
                      border: `1px solid ${isActive ? 'var(--green)' : 'var(--line)'}`,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </div>

        </div>

        {/* Right Side: Motions List */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          {userRole !== 'member' && pendingSubmissions.length > 0 && (
            <article className="panel" style={{ display: 'grid', gap: 12 }}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Motion review</p>
                  <h3>Pending member submissions</h3>
                </div>
                <span className="rank-badge">{pendingSubmissions.length} pending</span>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {pendingSubmissions.map((submission) => (
                  <div key={submission.id} className="library-card" style={{ padding: 14, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8 }}>
                    <strong>{submission.draft.text || 'Untitled motion'}</strong>
                    <p style={{ color: 'var(--muted)', margin: '6px 0' }}>
                      {submission.draft.motion_type || 'No type'} {submission.draft.competition ? `- ${submission.draft.competition}` : ''}
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="secondary-button" type="button" onClick={() => { void reviewMotionSubmission(submission, 'approved'); }}>Approve</button>
                      <button className="danger-button" type="button" onClick={() => { if (window.confirm('Reject this motion submission?')) void reviewMotionSubmission(submission, 'rejected'); }}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>Showing {filteredMotions.length} motions</span>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {[0, 1, 2].map((item) => (
                <div key={item} className="panel" style={{ display: 'grid', gap: 12 }}>
                  <div style={{ width: '38%', height: 16, borderRadius: 8, background: '#eef1ef' }} />
                  <div style={{ width: '100%', height: 20, borderRadius: 8, background: '#eef1ef' }} />
                  <div style={{ width: '70%', height: 12, borderRadius: 999, background: '#eef1ef' }} />
                </div>
              ))}
            </div>
          ) : filteredMotions.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '12px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📚</div>
              <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '8px' }}>Wah, belum ada motion yang cocok</strong>
              <span style={{ color: 'var(--muted)', display: 'block', maxWidth: '400px', margin: '0 auto' }}>
                Coba ubah kata kunci pencarian atau bersihkan filter di samping untuk melihat koleksi lainnya.
              </span>
            </div>
          ) : (
            <>
              {filteredMotions.slice(0, visibleCount).map((motion) => (
              <div key={motion.id} className="library-card" style={{ padding: '20px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--ink)', fontWeight: 600 }}>
                    {motion.competition ? `${motion.competition} ${motion.year || ''}` : 'Independent Motion'}
                  </h4>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <button
                      onClick={() => toggleBookmark(motion.id)}
                      style={{ background: 'none', border: 'none', color: bookmarkedMotions.has(motion.id) ? 'var(--green)' : 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s', padding: 0 }}
                      title={bookmarkedMotions.has(motion.id) ? "Remove Bookmark" : "Bookmark Motion"}
                    >
                      {bookmarkedMotions.has(motion.id) ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                      )}
                    </button>

                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === motion.id ? null : motion.id); }}
                        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}
                      >
                        ⋮
                      </button>

                      {activeDropdown === motion.id && (
                        <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '8px', padding: '8px', zIndex: 10, minWidth: '150px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                          <button type="button" onClick={() => { copyMotionText(motion.text); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--ink)' }}>
                            Copy Motion Text
                          </button>
                          {userRole !== 'member' && (
                            <>
                              <button type="button" onClick={() => handleEditClick(motion)} style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--green)', borderTop: '1px solid var(--line)', marginTop: '4px', paddingTop: '8px' }}>
                                Edit Motion
                              </button>
                              <button type="button" onClick={() => { void deleteMotion(motion); }} style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem', color: '#ef4444', borderTop: '1px solid var(--line)', marginTop: '4px', paddingTop: '8px' }}>
                                Delete Motion
                              </button>
                            </>
                          )}
                          <button type="button" onClick={() => { reportMotion(); setActiveDropdown(null); }} style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem', color: '#ef4444', borderTop: '1px solid var(--line)', marginTop: '4px', paddingTop: '8px' }}>
                            Report Error
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Motion Text */}
                <strong style={{ fontSize: '1.15rem', lineHeight: 1.5, color: 'var(--ink)', fontWeight: 400, fontFamily: 'serif', letterSpacing: '0.3px' }}>
                  {motion.text}
                </strong>

                {/* Footer Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {Array.from(new Set([
                      ...(motion.primary_category ? motion.primary_category.split(', ') : []),
                      ...(motion.secondary_category ? motion.secondary_category.split(', ') : [])
                    ])).map(cat => (
                      <button
                        key={cat}
                        onClick={() => toggleTopic(cat)}
                        className="rank-badge"
                        style={{
                          background: selectedTopics.includes(cat) ? 'var(--green)' : 'var(--paper)',
                          color: selectedTopics.includes(cat) ? 'white' : 'var(--muted)',
                          border: `1px solid ${selectedTopics.includes(cat) ? 'var(--green)' : 'var(--line)'}`,
                          cursor: 'pointer',
                          padding: '4px 12px',
                          borderRadius: '16px',
                          fontSize: '0.85rem'
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Round 1 {motion.motion_type && `• ${motion.motion_type}`}</span>
                </div>
              </div>
            ))}
            
            {visibleCount < filteredMotions.length && (
              <div style={{ textAlign: 'center', marginTop: '16px', marginBottom: '32px' }}>
                <button 
                  onClick={() => setVisibleCount(prev => prev + 15)}
                  className="secondary-button" 
                  style={{ padding: '10px 24px', borderRadius: '999px', fontSize: '0.95rem', fontWeight: 600, background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                >
                  Load More Motions
                </button>
              </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* Add Motion Modal Overlay */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--panel)', width: '100%', maxWidth: '550px', maxHeight: '90dvh', display: 'flex', flexDirection: 'column', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: '1px solid var(--line)' }}>

            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--paper)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>i</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--ink)' }}>{editingMotion ? 'Edit Motion' : 'Submit Motion Data'}</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--muted)' }}>{editingMotion ? 'Update motion details' : 'Help us expand our debate motion database'}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveMotion} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Motion Text <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea
                  value={newMotion.text}
                  onChange={e => setNewMotion({ ...newMotion, text: e.target.value })}
                  placeholder="e.g. This house believes that..."
                  required
                  style={{
                    width: '100%', padding: '12px', borderRadius: '6px', background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)',
                    fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical', minHeight: '80px'
                  }}
                />
              </div>

              <div className="form-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Round Type <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {MOTION_TYPES.map(t => (
                      <button
                        key={t} type="button"
                        onClick={() => setNewMotion({ ...newMotion, motion_type: newMotion.motion_type === t ? '' : t })}
                        style={{
                          background: newMotion.motion_type === t ? 'var(--green)' : 'var(--paper)',
                          color: newMotion.motion_type === t ? 'white' : 'var(--ink)',
                          border: `1px solid ${newMotion.motion_type === t ? 'var(--green)' : 'var(--line)'}`,
                          padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s'
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Year</label>
                  <input
                    type="number"
                    value={newMotion.year}
                    onChange={e => setNewMotion({ ...newMotion, year: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)', fontSize: '1rem', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Primary Topics</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '140px', overflowY: 'auto', padding: '12px', background: 'var(--paper)', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    {PRIMARY_TOPICS.map(t => {
                      const isActive = newMotion.primary_categories.includes(t);
                      return (
                        <button
                          key={t} type="button"
                          onClick={() => {
                            if (isActive) setNewMotion({ ...newMotion, primary_categories: newMotion.primary_categories.filter(c => c !== t) });
                            else setNewMotion({ ...newMotion, primary_categories: [...newMotion.primary_categories, t] });
                          }}
                          style={{
                            background: isActive ? 'var(--green)' : 'transparent',
                            color: isActive ? 'white' : 'var(--ink)',
                            border: `1px solid ${isActive ? 'var(--green)' : 'var(--line)'}`,
                            padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s'
                          }}
                        >
                          {t}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Secondary Topics</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '140px', overflowY: 'auto', padding: '12px', background: 'var(--paper)', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    {SECONDARY_TOPICS.map(t => {
                      const isActive = newMotion.secondary_categories.includes(t);
                      return (
                        <button
                          key={t} type="button"
                          onClick={() => {
                            if (isActive) setNewMotion({ ...newMotion, secondary_categories: newMotion.secondary_categories.filter(c => c !== t) });
                            else setNewMotion({ ...newMotion, secondary_categories: [...newMotion.secondary_categories, t] });
                          }}
                          style={{
                            background: isActive ? 'var(--green)' : 'transparent',
                            color: isActive ? 'white' : 'var(--ink)',
                            border: `1px solid ${isActive ? 'var(--green)' : 'var(--line)'}`,
                            padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s'
                          }}
                        >
                          {t}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="form-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Competition Name</label>
                  <input
                    type="text"
                    value={newMotion.competition}
                    onChange={e => setNewMotion({ ...newMotion, competition: e.target.value })}
                    placeholder="e.g. WUDC, UADC"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)', fontSize: '1rem', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>Tournament Tab URL</label>
                  <input
                    type="url"
                    value={newMotion.tab_url}
                    onChange={e => setNewMotion({ ...newMotion, tab_url: e.target.value })}
                    placeholder="https://..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)', fontSize: '1rem', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              <div style={{ background: 'var(--paper)', border: '1px solid var(--green)', padding: '12px 16px', borderRadius: '8px', display: 'flex', gap: '12px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--green)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', flexShrink: 0, marginTop: '2px' }}>i</div>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '0.9rem', color: 'var(--ink)' }}>Help us improve our database</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.4 }}>
                    While only the Motion Text and Type are required, providing additional details like topics and competition helps us process your submission more accurately.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="ghost-button" onClick={() => { setShowModal(false); setEditingMotion(null); setNewMotion({ text: '', motion_type: '', primary_categories: [], secondary_categories: [], competition: '', year: new Date().getFullYear().toString(), tab_url: '' }); }} style={{ borderRadius: '6px', padding: '10px 20px', fontSize: '1rem', fontWeight: 500, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={saving} style={{ borderRadius: '6px', padding: '10px 20px', fontSize: '1rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving...' : editingMotion ? 'Update Motion' : 'Submit Motion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  );
}

