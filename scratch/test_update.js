const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gkkwazoodmwcpagxcsja.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdra3dhem9vZG13Y3BhZ3hjc2phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTE5ODQsImV4cCI6MjA5MzI4Nzk4NH0.r6kMhMvTa_Wp7DbtZKyMeofwQ7KLdZN9ZSUwkfoxZa4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: profiles } = await supabase.from('profiles').select('*').eq('name', 'Wancoyyy');
  if (profiles && profiles.length > 0) {
    const profile = profiles[0];
    console.log("Found profile:", profile.id);
    const payload = {
        contact_links: {
            website: "newwebsite.com",
            whatsapp: "123",
            instagram: "@test"
        }
    };
    const { data, error } = await supabase.from('profiles').update(payload).eq('id', profile.id);
    if (error) {
        console.error("UPDATE ERROR:", error);
    } else {
        console.log("UPDATE SUCCESS:", data);
    }
  } else {
    console.log("Profile not found");
  }
}

run();
