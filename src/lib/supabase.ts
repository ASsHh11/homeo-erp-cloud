import { createClient } from '@supabase/supabase-js';

// Aapki actual keys direct code mein fix kar di hain
const supabaseUrl = 'https://gzepnidgljbpjhcdyseq.supabase.co';
const supabaseAnonKey = 'sb_publishable_uPTuaY9jSWSu3Qt7zrnXSQ_OBx6x3ox';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
