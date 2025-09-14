import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "COSMILE - Member Profile | STARLUX Airlines",
  description: "Manage your COSMILE membership, view points, and booking history",
}

export default function ProfileLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <>{children}</>
}
