import { createClient } from '@supabase/supabase-js';

// Backup links direct code mein daal diye hain taaki error na aaye
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gzepnidgljbpjhcdyseq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_uPTuaY9jSWSu3Qt7zrnXSQ_OBx6x3ox';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
