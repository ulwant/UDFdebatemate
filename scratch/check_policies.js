const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gkkwazoodmwcpagxcsja.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdra3dhem9vZG13Y3BhZ3hjc2phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTE5ODQsImV4cCI6MjA5MzI4Nzk4NH0.r6kMhMvTa_Wp7DbtZKyMeofwQ7KLdZN9ZSUwkfoxZa4';

// Use service role key to query pg_policies if possible, but anon key won't work for pg_policies.
// Actually, I can just look at the SQL files in the workspace.
