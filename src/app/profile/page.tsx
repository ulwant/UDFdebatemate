import { supabase } from '@/lib/supabaseClient';
import ProfileDirectory, { ProfileRow } from './ProfileDirectory';

export const revalidate = 0;

export default async function ProfilePage() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching profiles:', error);
  }

  return (
    <section id="profiles" className="section active-section" style={{ display: 'block' }}>
      {error ? (
        <p>Error loading profiles. Did you set up the database?</p>
      ) : (
        <ProfileDirectory profiles={(profiles || []) as ProfileRow[]} />
      )}
    </section>
  );
}
