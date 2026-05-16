import { supabase } from '@/lib/supabaseClient';
import ProfileDirectory, { ProfileRow } from './ProfileDirectory';

// Revalidate every 60 seconds (ISR)
export const revalidate = 60;

export default async function ProfilePage() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

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
