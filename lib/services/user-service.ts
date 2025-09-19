// Security: User data service using Supabase session tokens
// This replaces unsafe localStorage/sessionStorage for user data

import supabaseClient from '@/lib/supabase/supabaseClient'

interface UserData {
  userId: number
  customerId: string
  username: string
}

export async function getUserData(): Promise<UserData | null> {
  try {
    // Get current session - this uses secure HTTP-only cookies
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()
    
    if (sessionError || !session?.user) {
      console.error('No valid session:', sessionError)
      return null
    }

    // Fetch user data from database using authenticated session
    const { data: userData, error: userError } = await supabaseClient
      .from("users")
      .select("userid, customerid, username")
      .eq("username", session.user.email)
      .single()

    if (userError) {
      console.error('Error fetching user data:', userError)
      return null
    }

    return {
      userId: userData.userid,
      customerId: userData.customerid,
      username: userData.username
    }
  } catch (error) {
    console.error('Error in getUserData:', error)
    return null
  }
}

export async function isUserAuthenticated(): Promise<boolean> {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession()
    return !!session?.user
  } catch (error) {
    console.error('Error checking authentication:', error)
    return false
  }
}