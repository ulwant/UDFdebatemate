'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ProfileDirectory, { ProfileRow } from './ProfileDirectory';

export default function ProfilePage() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchProfiles() {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .neq('member_type', 'guest')
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(true);
      } else {
        setProfiles((data || []) as ProfileRow[]);
      }
      setLoading(false);
    }

    void fetchProfiles();
  }, []);

  if (loading) {
    return (
      <section id="profiles" className="section active-section" style={{ display: 'block' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="panel" style={{ display: 'grid', gap: 10 }}>
            <div style={{ width: 110, height: 12, borderRadius: 999, background: 'var(--green-soft)' }} />
            <div style={{ width: '45%', height: 26, borderRadius: 8, background: '#eef1ef' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <article key={item} className="panel" style={{ display: 'grid', gap: 12 }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#eef1ef' }} />
                <div style={{ width: '70%', height: 18, borderRadius: 8, background: '#eef1ef' }} />
                <div style={{ width: '100%', height: 10, borderRadius: 999, background: '#eef1ef' }} />
                <div style={{ width: '82%', height: 10, borderRadius: 999, background: '#eef1ef' }} />
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="profiles" className="section active-section" style={{ display: 'block' }}>
      {error ? (
        <p>Error loading profiles. Did you set up the database?</p>
      ) : (
        <ProfileDirectory profiles={profiles} />
      )}
    </section>
  );
}
