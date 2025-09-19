import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/supabase/auth-context"
import { LanguageProvider } from "@/lib/language-context"
import { RegistrationProvider } from "@/lib/registration-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Cloud Airlines",
  description: "Book your flights with Cloud Airlines",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <RegistrationProvider>
              <LanguageProvider>{children}</LanguageProvider>
            </RegistrationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
