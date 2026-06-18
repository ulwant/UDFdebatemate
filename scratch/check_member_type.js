const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gkkwazoodmwcpagxcsja.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdra3dhem9vZG13Y3BhZ3hjc2phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTE5ODQsImV4cCI6MjA5MzI4Nzk4NH0.r6kMhMvTa_Wp7DbtZKyMeofwQ7KLdZN9ZSUwkfoxZa4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase.from('profiles').select('name, member_type, system_role, contact_links, privacy_settings');
  console.log(JSON.stringify(data, null, 2));
}

run();
