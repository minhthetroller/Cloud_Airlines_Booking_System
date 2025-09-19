import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This is the service role key, not anon key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    const { userId, email, password, token } = await request.json()

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 })
    }

    if (!userId && !email) {
      return NextResponse.json({ error: "User ID or email is required" }, { status: 400 })
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 })
    }

    let userToUpdate = userId

    // If we don't have userId but have email, find the user by email
    if (!userId && email) {
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (listError) {
        console.error("Error listing users:", listError)
        return NextResponse.json({ error: "Could not find user with the provided email. Please try again or contact support." }, { status: 400 })
      }

      const user = users.users.find(u => u.email === email)
      if (!user) {
        return NextResponse.json({ error: "Could not find user with the provided email. Please try again or contact support." }, { status: 400 })
      }

      userToUpdate = user.id
    }

    // Update the user's password using admin privileges
    const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userToUpdate, {
      password: password,
      email_confirm: true, // Confirm the email as part of password setting
    })

    if (updateError) {
      console.error("Error updating user password:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Password updated successfully",
      userId: userToUpdate 
    })

  } catch (error: any) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}