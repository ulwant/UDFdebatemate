const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gkkwazoodmwcpagxcsja.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdra3dhem9vZG13Y3BhZ3hjc2phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTE5ODQsImV4cCI6MjA5MzI4Nzk4NH0.r6kMhMvTa_Wp7DbtZKyMeofwQ7KLdZN9ZSUwkfoxZa4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: profiles } = await supabase.from('profiles').select('*').eq('name', 'Wancoyyy');
  if (profiles && profiles.length > 0) {
    const profile = profiles[0];
    const payload = {
      name: profile.name,
      bio: profile.bio,
      caption: profile.caption,
      avatar_initials: profile.avatar_initials,
      avatar_color: profile.avatar_color,
      profile_picture_url: profile.profile_picture_url,
      header_picture_url: profile.header_picture_url,
      batch: profile.batch || null,
      member_type: profile.member_type || 'newbie',
      debating_experience: null,
      birthdate: profile.member_type === 'guest' ? null : profile.birthdate || null,
      username: profile.member_type === 'guest' ? null : profile.username || null,
      faculty: profile.faculty || null,
      major: profile.major || null,
      delegation_status: profile.member_type === 'guest' ? profile.delegation_status || null : null,
      approval_status: profile.approval_status === 'rejected' ? 'pending_approval' : (profile.approval_status || 'pending_approval'),
      rejection_reason: null,
      discord_roles: profile.member_type === 'guest' ? [] : profile.discord_roles,
      contact_links: {
          website: "newwebsite.com",
          whatsapp: "123",
          instagram: "@testing"
      },
      achievements: profile.member_type === 'guest' ? [] : profile.achievements,
      debating_history: profile.member_type === 'guest' ? [] : profile.debating_history
    };

    const { error: updateError, data } = await supabase.from('profiles').update(payload).eq('id', profile.id);
    if (updateError) {
      console.error("UPDATE ERROR:", updateError);
    } else {
      console.log("UPDATE SUCCESS:", data);
    }
  }
}

run();
