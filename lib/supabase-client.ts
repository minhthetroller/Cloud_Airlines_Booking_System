import { createClient } from "@supabase/supabase-js"

// Use environment variables for Supabase connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Create a singleton instance of the Supabase client
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

export default supabaseClient
