import { type NextRequest, NextResponse } from "next/server"
import resend from "@/lib/resend/resend"
import { createPasswordReset } from "@/lib/server/accounts"


export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Store a one-hour reset token for the user
    let resetToken: string
    try {
      resetToken = await createPasswordReset(email)
    } catch {
      return NextResponse.json({ error: "Email address not found" }, { status: 404 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.cloud-airlines.space/"
    const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${resetToken}`

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM || "COSMILE <noreply@cloud-airlines.space>",
      to: [email],
      subject: "Reset Your COSMILE Password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${baseUrl}/logo.png" alt="COSMILE Logo" style="height: 60px;">
          </div>
          
          <div style="background-color: #f8f5f2; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h1 style="color: #0f2d3c; text-align: center; margin-bottom: 20px;">Reset Your Password</h1>
            
            <p style="margin-bottom: 20px;">Hello,</p>
            
            <p style="margin-bottom: 20px;">We received a request to reset your COSMILE account password. Click the button below to create a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #8a7a4e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
            </div>
            
            <p style="margin-bottom: 20px;">If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 5px; font-family: monospace;">${resetUrl}</p>
            
            <p style="margin-bottom: 20px;">This link will expire in 1 hour for security reasons.</p>
            
            <p style="margin-bottom: 20px;">If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 14px;">
            <p>This email was sent by COSMILE - The premium frequent flyer program</p>
            <p>© 2024 STARLUX Airlines. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error("Resend error:", error)
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Password reset email error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
