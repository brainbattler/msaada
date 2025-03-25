import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are available, otherwise use placeholder values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    'Supabase environment variables are missing. Please click the "Connect to Supabase" button in the top right to set up your project.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);