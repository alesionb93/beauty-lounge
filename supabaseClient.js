import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dtslpuqhvyamdittevul.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0c2xwdXFodnlhbWRpdHRldnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NzA0MTcsImV4cCI6MjA5MTU0NjQxN30.wjQusHU566_2s9piC9qO-fqCPIJVrXPbd7YEfEzXl_U'

export const supabase = createClient(supabaseUrl, supabaseKey)