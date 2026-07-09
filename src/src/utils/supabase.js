import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rqqwyfmygllthbfdtqcd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxcXd5Zm15Z2xsdGhiZmR0cWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTcwOTEsImV4cCI6MjA5OTE3MzA5MX0.EDmbxHk2ovNArVX1a9N2M8vitvxFHmS8QeUtHJmRzSI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
