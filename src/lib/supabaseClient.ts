import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://aucotohpuzdqxdprjlwb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1Y290b2hwdXpkcXhkcHJqbHdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MzI4MDEsImV4cCI6MjA4NzQwODgwMX0.SpAKPYkcZ8DXPDVXQLLM2WWa5_TQrV2v7Mc1p_eOEnI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
