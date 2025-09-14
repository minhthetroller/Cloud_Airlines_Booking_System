"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Search, Lock } from "lucide-react"
import supabaseClient from "@/lib/supabase"
import { sha256 } from "js-sha256"

interface User {
  userid: number
  username: string
  accountstatus: string
  tier: string
  points: number
  createdat: string
  reset_token?: string
  reset_expires?: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabaseClient
        .from("users")
        .select("userid, username, accountstatus, tier, points, createdat, reset_token, reset_expires")
        .order("createdat", { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (err: any) {
      setError("Failed to fetch users")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) || user.userid.toString().includes(searchTerm),
  )

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return

    setResetLoading(true)
    setError(null)

    try {
      const hashedPassword = sha256(newPassword)

      const { error } = await supabaseClient
        .from("users")
        .update({
          passwordhash: hashedPassword,
          reset_token: null,
          reset_expires: null,
        })
        .eq("userid", selectedUser.userid)

      if (error) throw error

      setSuccess(`Password reset successfully for ${selectedUser.username}`)
      setNewPassword("")
      setSelectedUser(null)
      fetchUsers()
    } catch (err: any) {
      setError("Failed to reset password")
      console.error(err)
    } finally {
      setResetLoading(false)
    }
  }

  const handleUpdateStatus = async (userId: number, newStatus: string) => {
    try {
      const { error } = await supabaseClient.from("users").update({ accountstatus: newStatus }).eq("userid", userId)

      if (error) throw error

      setSuccess(`User status updated to ${newStatus}`)
      fetchUsers()
    } catch (err: any) {
      setError("Failed to update user status")
      console.error(err)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "suspended":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8a7a4e]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0f2d3c] mb-2">User Management</h1>
          <p className="text-gray-600">Manage user accounts, passwords, and permissions</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Search by email or user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button onClick={fetchUsers} variant="outline">
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">User ID</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Tier</th>
                    <th className="text-left p-2">Points</th>
                    <th className="text-left p-2">Created</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.userid} className="border-b hover:bg-gray-50">
                      <td className="p-2">{user.userid}</td>
                      <td className="p-2">{user.username}</td>
                      <td className="p-2">
                        <Badge className={getStatusBadgeColor(user.accountstatus)}>{user.accountstatus}</Badge>
                      </td>
                      <td className="p-2">{user.tier}</td>
                      <td className="p-2">{user.points?.toLocaleString() || 0}</td>
                      <td className="p-2">{new Date(user.createdat).toLocaleDateString()}</td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => setSelectedUser(user)}>
                                <Lock className="h-4 w-4 mr-1" />
                                Reset Password
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Reset Password for {user.username}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="newPassword">New Password</Label>
                                  <Input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={handleResetPassword}
                                    disabled={resetLoading || !newPassword}
                                    className="bg-[#8a7a4e] hover:bg-[#8a7a4e]/90"
                                  >
                                    {resetLoading ? "Resetting..." : "Reset Password"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedUser(null)
                                      setNewPassword("")
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Select
                            value={user.accountstatus}
                            onValueChange={(value) => handleUpdateStatus(user.userid, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="verified">Verified</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
