import { createClient } from "@supabase/supabase-js"

// Use environment variables for Supabase connection
const supabaseUrl = "https://igxqaajyviipwpmfhqvi.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlneHFhYWp5dmlpcHdwbWZocXZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMDY3OTMsImV4cCI6MjA2MDc4Mjc5M30.KDMPMInai3qsQoFRwcxxk0LW9DzFT1I5yf5y2SVtwms"

// Create a singleton instance of the Supabase client
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

export default supabaseClient
