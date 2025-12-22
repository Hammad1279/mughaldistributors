import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cnxppxfxnwuhcoenjkdk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNueHBweGZ4bnd1aGNvZW5qa2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMDU0ODcsImV4cCI6MjA4MTg4MTQ4N30.WBArf4YBdhAcIOpLXaHexRIP6fNJJGLkFGDdNWBa3O4'; 

export const supabase = createClient(supabaseUrl, supabaseKey);