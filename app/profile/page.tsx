"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Edit2, Check, X, Calendar, Plane } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/language-context"
import TierBenefitsModal from "@/components/tier-benefits-modal"
import axios from "axios"

interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  title: string
  points: number
  tier: string
  cosmileId: string
  lastLogin: string
}

interface CustomerDetails {
  pronoun: string
  firstname: string
  lastname: string
  dateofbirth: string
  gender: string
  nationality: string
  identitycardnumber: string
  phonenumber: string
  email: string
  addressline: string
  city: string
  country: string
}

interface BookingHistory {
  id: string
  reference: string
  flightNumber: string
  departureAirport: string
  arrivalAirport: string
  departureDate: string
  status: string
  price: number
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("account")
  const [user, setUser] = useState<UserProfile | null>(null)
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null)
  const [bookings, setBookings] = useState<BookingHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState<CustomerDetails | null>(null)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [router, setRouter] = useState(useRouter())
  const { isAuthenticated, user: authUser, signOut } = useAuth()
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
  const { language, setLanguage, t } = useLanguage()
  const [showPointHistory, setShowPointHistory] = useState(false)
  const [pointHistory, setPointHistory] = useState<any[]>([])
  const [pointHistoryLoading, setPointHistoryLoading] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      // If not authenticated, redirect to home
      if (!isAuthenticated) {
        router.push("/")
        return
      }

      if (authUser) {
        fetchUserData(authUser.email)
      }
    }

    checkAuth()
  }, [isAuthenticated, authUser, router])

  const fetchUserData = async (email: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await axios.get(`/api/profile?email=${encodeURIComponent(email)}`)
      
      const data = response.data

      setUser(data.user)
      setCustomerDetails(data.customerDetails)
      setFormData(data.customerDetails)
      setBookings(data.recentBookings)

      // Store IDs in session storage for later use
      if (data.ids) {
        sessionStorage.setItem("userId", data.ids.userId)
        sessionStorage.setItem("customerId", data.ids.customerId)
      }
    } catch (err: any) {
      console.error("Error fetching user data:", err)
      setError(err.response?.data?.error || "Failed to load profile data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof CustomerDetails, value: string) => {
    if (formData) {
      setFormData({
        ...formData,
        [field]: value,
      })
    }
  }

  const handleUpdateProfile = async () => {
    if (!formData || !user) return

    setUpdateLoading(true)
    setUpdateError(null)
    setUpdateSuccess(false)

    try {
      // Check if identity card number is already taken by another customer
      if (formData.identitycardnumber && formData.identitycardnumber !== customerDetails?.identitycardnumber) {
        // We'll handle this validation on the server side
      }

      // Build update object with only changed fields
      const updateData: any = {}
      if (formData.pronoun !== customerDetails?.pronoun) updateData.pronoun = formData.pronoun
      if (formData.firstname !== customerDetails?.firstname) updateData.firstname = formData.firstname
      if (formData.lastname !== customerDetails?.lastname) updateData.lastname = formData.lastname
      if (formData.dateofbirth !== customerDetails?.dateofbirth) updateData.dateofbirth = formData.dateofbirth
      if (formData.gender !== customerDetails?.gender) updateData.gender = formData.gender
      if (formData.nationality !== customerDetails?.nationality) updateData.nationality = formData.nationality
      if (formData.identitycardnumber !== customerDetails?.identitycardnumber)
        updateData.identitycardnumber = formData.identitycardnumber
      if (formData.phonenumber !== customerDetails?.phonenumber) updateData.phonenumber = formData.phonenumber
      if (formData.addressline !== customerDetails?.addressline) updateData.addressline = formData.addressline
      if (formData.city !== customerDetails?.city) updateData.city = formData.city
      if (formData.country !== customerDetails?.country) updateData.country = formData.country

      // Only update if there are changes
      if (Object.keys(updateData).length > 0) {
        const response = await axios.put('/api/profile', {
          userId: sessionStorage.getItem("userId"),
          customerDetails: updateData,
        })
      }

      setCustomerDetails(formData)
      setUpdateSuccess(true)
      setEditMode(false)

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setUpdateSuccess(false)
      }, 3000)

      // Update user display name
      setUser({
        ...user,
        firstName: formData.firstname,
        lastName: formData.lastname,
        title: formData.pronoun,
      })
    } catch (err: any) {
      console.error("Error updating profile:", err)
      if (err.response?.data?.error?.includes("identitycardnumber")) {
        setUpdateError("This identity card number is already registered to another account.")
      } else {
        setUpdateError(err.response?.data?.error || err.message || "Failed to update profile. Please try again.")
      }
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "vi" : "en")
    setLanguageMenuOpen(false)
  }

  const getTierCardImage = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "stratus":
        return "/images/stratus-card.png"
      case "altostratus":
        return "/images/altostratus-card.png"
      case "cirrus":
        return "/images/cirrus-card.png"
      default:
        return "/images/stratus-card.png"
    }
  }

  const fetchPointHistory = async () => {
    setPointHistoryLoading(true)
    try {
      if (!user?.email) {
        console.error("User email not found")
        return
      }

      const response = await axios.get(`/api/profile/points?email=${encodeURIComponent(user.email)}`)
      
      const data = response.data
      setPointHistory(data.pointHistory)
    } catch (error: any) {
      console.error("Error fetching point history:", error)
    } finally {
      setPointHistoryLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f2d3c] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-[#0f2d3c] flex flex-col items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Failed to load profile. Please sign in again."}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/")} className="mt-4">
          Return to Home
        </Button>
      </div>
    )
  }

  const userTier = user.tier

  return (
    <div className="min-h-screen bg-[#0f2d3c] text-white">
      {/* Header */}
      <header className="border-b border-[#1a3a4a]">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/">
              <Image src="/logo.png" alt="Cloud Airlines" width={180} height={60} className="h-8 w-auto" />
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            <div className="relative group">
              <button className="text-white flex items-center">
                <span className="mr-1">{language === "en" ? "Global (English)" : "Toàn cầu (Tiếng Việt)"}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                {languageMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                    <button
                      onClick={toggleLanguage}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {language === "en" ? "Tiếng Việt" : "English"}
                    </button>
                  </div>
                )}
              </button>
            </div>
            <div className="flex items-center">
              <span className="text-white">
                {user.firstName} {user.lastName}
              </span>
              <button onClick={handleSignOut} className="ml-2 text-white hover:text-gray-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-[#0f2d3c] border-b border-[#1a3a4a]">
        <div className="container mx-auto px-4">
          <ul className="flex space-x-8">
            <li>
              <Link href="/" className="block py-4 text-white hover:text-[#9b6a4f]">
                Home
              </Link>
            </li>
            <li>
              <Link href="/profile/booking-history" className="block py-4 text-white hover:text-[#9b6a4f]">
                My Bookings
              </Link>
            </li>
            <li>
              <a href="#" className="block py-4 text-white hover:text-[#9b6a4f] border-b-2 border-[#9b6a4f]">
                COSMILE
              </a>
            </li>
            <li>
              <a href="#" className="block py-4 text-white hover:text-[#9b6a4f]">
                Support
              </a>
            </li>
          </ul>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl mb-8">COSMILE</h1>

        {/* User Info Card */}
        <div className="bg-[#0a1e29] rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-6 md:mb-0">
              <h2 className="text-2xl text-[#9b6a4f] mb-2">
                Hi, {user.title} {user.firstName} {user.lastName}
              </h2>
              <p className="text-gray-400 mb-6">Last login time : {user.lastLogin}</p>

              <div className="grid grid-cols-3 gap-8">
                <div>
                  <p className="text-gray-400 mb-1">Tier</p>
                  <p className="text-xl text-[#9b6a4f] font-bold">{user.tier}</p>
                  <TierBenefitsModal currentTier={userTier}>
                    <button
                      type="button"
                      className="text-[#9b6a4f] text-sm mt-2 flex items-center hover:underline cursor-pointer"
                    >
                      Privileges of other tiers
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="ml-1"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </TierBenefitsModal>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Validity</p>
                  <p className="text-xl">Permanent</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">COSMILE ID</p>
                  <p className="text-xl">{user.cosmileId}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center md:justify-end">
              <div className="relative w-64 h-40">
                <Image
                  src={getTierCardImage(user.tier) || "/placeholder.svg"}
                  alt={`${user.tier} Card`}
                  fill
                  className="object-contain"
                />
                <div className="absolute bottom-4 right-4 text-white font-bold">{user.tier.toUpperCase()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Points Summary */}
        <div className="bg-[#f8f5f2] text-[#0f2d3c] rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg mb-2">
                Award <span className="text-[#9b6a4f]">points</span>
              </h3>
              <div className="text-3xl font-bold mb-1">
                {user.points.toLocaleString()} <span className="text-[#9b6a4f] text-lg">points</span>
              </div>
              <p className="text-sm">0 award points that will expire within 6 months</p>
            </div>
            <div>
              <h3 className="text-lg mb-2">For Tier Upgrade</h3>
              <div className="text-3xl font-bold mb-1">
                {user.tier === "Stratus" ? (
                  <>
                    {(5000 - user.points).toLocaleString()} <span className="text-[#9b6a4f] text-lg">points</span>
                  </>
                ) : user.tier === "Altostratus" ? (
                  <>
                    {(10000 - user.points).toLocaleString()} <span className="text-[#9b6a4f] text-lg">points</span>
                  </>
                ) : (
                  <>
                    0 <span className="text-[#9b6a4f] text-lg">points</span>
                  </>
                )}
              </div>
              <p className="text-sm">
                {user.tier === "Stratus" ? (
                  <>Need {(5000 - user.points).toLocaleString()} tier points to the next card tier</>
                ) : user.tier === "Altostratus" ? (
                  <>Need {(10000 - user.points).toLocaleString()} tier points to the next card tier</>
                ) : (
                  <>You have reached the highest tier</>
                )}
              </p>
            </div>
            <div>
              <h3 className="text-lg mb-2">For Tier Renewal</h3>
              <div className="text-3xl font-bold mb-1">Permanent</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-transparent">
            <TabsTrigger
              value="account"
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#9b6a4f] data-[state=active]:text-[#9b6a4f] rounded-none bg-transparent py-4 text-lg"
            >
              <div className="flex flex-col items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mb-2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                My Account
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="points"
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#9b6a4f] data-[state=active]:text-[#9b6a4f] rounded-none bg-transparent py-4 text-lg"
            >
              <div className="flex flex-col items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mb-2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 8l-8 8" />
                  <path d="M8.5 8.5l7 7" />
                  <path d="M16 16H8.5V8.5" />
                </svg>
                Points
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#9b6a4f] data-[state=active]:text-[#9b6a4f] rounded-none bg-transparent py-4 text-lg"
            >
              <div className="flex flex-col items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mb-2"
                >
                  <path d="M12 8v4l3 3" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Booking History
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Add margin between tabs and content */}
          <div className="mt-8">
            {/* My Account Tab */}
            <TabsContent value="account" className="pt-6">
              <div className="bg-[#0a1e29] rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">Personal Information</h3>
                  {!editMode ? (
                    <Button
                      onClick={() => setEditMode(true)}
                      variant="outline"
                      className="border-[#9b6a4f] text-[#9b6a4f] hover:bg-[#9b6a4f] hover:text-white transition-colors"
                    >
                      <Edit2 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                  ) : (
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => {
                          setEditMode(false)
                          setFormData(customerDetails)
                          setUpdateError(null)
                          setUpdateSuccess(false)
                        }}
                        variant="outline"
                        className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                      >
                        <X className="mr-2 h-4 w-4" /> Cancel
                      </Button>
                      <Button
                        onClick={handleUpdateProfile}
                        className="bg-[#9b6a4f] hover:bg-[#8a5a42] text-white transition-colors"
                        disabled={updateLoading}
                      >
                        <Check className="mr-2 h-4 w-4" /> Save
                      </Button>
                    </div>
                  )}
                </div>

                {updateError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{updateError}</AlertDescription>
                  </Alert>
                )}

                {updateSuccess && (
                  <Alert className="mb-4 bg-green-500/10 text-green-500 border-green-500">
                    <Check className="h-4 w-4" />
                    <AlertDescription>Profile updated successfully!</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {editMode && formData ? (
                    <>
                      <div>
                        <Label htmlFor="title" className="text-gray-400 mb-1 block">
                          Title
                        </Label>
                        <Select
                          value={formData.pronoun}
                          onValueChange={(value) => handleInputChange("pronoun", value)}
                          disabled={!editMode}
                        >
                          <SelectTrigger className="bg-[#0f2d3c] border-[#1a3a4a]">
                            <SelectValue placeholder="Select title" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Mr.">Mr.</SelectItem>
                            <SelectItem value="Mrs.">Mrs.</SelectItem>
                            <SelectItem value="Ms.">Ms.</SelectItem>
                            <SelectItem value="Dr.">Dr.</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="email" className="text-gray-400 mb-1 block">
                          Email
                        </Label>
                        <Input
                          id="email"
                          value={user.email}
                          disabled
                          className="bg-[#0f2d3c] border-[#1a3a4a] text-gray-400"
                        />
                      </div>

                      <div>
                        <Label htmlFor="firstName" className="text-gray-400 mb-1 block">
                          First Name
                        </Label>
                        <Input
                          id="firstName"
                          value={formData.firstname}
                          onChange={(e) => handleInputChange("firstname", e.target.value)}
                          disabled={!editMode}
                          className="bg-[#0f2d3c] border-[#1a3a4a]"
                        />
                      </div>

                      <div>
                        <Label htmlFor="lastName" className="text-gray-400 mb-1 block">
                          Last Name
                        </Label>
                        <Input
                          id="lastName"
                          value={formData.lastname}
                          onChange={(e) => handleInputChange("lastname", e.target.value)}
                          disabled={!editMode}
                          className="bg-[#0f2d3c] border-[#1a3a4a]"
                        />
                      </div>

                      <div>
                        <Label htmlFor="idNumber" className="text-gray-400 mb-1 block">
                          Identity Card Number
                        </Label>
                        <Input
                          id="idNumber"
                          value={formData.identitycardnumber}
                          onChange={(e) => handleInputChange("identitycardnumber", e.target.value)}
                          disabled={!editMode}
                          className="bg-[#0f2d3c] border-[#1a3a4a]"
                        />
                      </div>

                      <div>
                        <Label htmlFor="phoneNumber" className="text-gray-400 mb-1 block">
                          Phone Number
                        </Label>
                        <Input
                          id="phoneNumber"
                          value={formData.phonenumber}
                          onChange={(e) => handleInputChange("phonenumber", e.target.value)}
                          disabled={!editMode}
                          className="bg-[#0f2d3c] border-[#1a3a4a]"
                        />
                      </div>

                      <div>
                        <Label htmlFor="gender" className="text-gray-400 mb-1 block">
                          Gender
                        </Label>
                        <Select
                          value={formData.gender}
                          onValueChange={(value) => handleInputChange("gender", value)}
                          disabled={!editMode}
                        >
                          <SelectTrigger className="bg-[#0f2d3c] border-[#1a3a4a]">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="nationality" className="text-gray-400 mb-1 block">
                          Nationality
                        </Label>
                        <Select
                          value={formData.nationality}
                          onValueChange={(value) => handleInputChange("nationality", value)}
                          disabled={!editMode}
                        >
                          <SelectTrigger className="bg-[#0f2d3c] border-[#1a3a4a]">
                            <SelectValue placeholder="Select nationality" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            <SelectItem value="VN">Vietnam</SelectItem>
                            <SelectItem value="US">United States</SelectItem>
                            <SelectItem value="UK">United Kingdom</SelectItem>
                            <SelectItem value="CA">Canada</SelectItem>
                            <SelectItem value="AU">Australia</SelectItem>
                            <SelectItem value="JP">Japan</SelectItem>
                            <SelectItem value="TW">Taiwan</SelectItem>
                            <SelectItem value="CN">China</SelectItem>
                            <SelectItem value="HK">Hong Kong</SelectItem>
                            <SelectItem value="SG">Singapore</SelectItem>
                            <SelectItem value="MY">Malaysia</SelectItem>
                            <SelectItem value="TH">Thailand</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="addressLine" className="text-gray-400 mb-1 block">
                          Address
                        </Label>
                        <Input
                          id="addressLine"
                          value={formData.addressline}
                          onChange={(e) => handleInputChange("addressline", e.target.value)}
                          disabled={!editMode}
                          className="bg-[#0f2d3c] border-[#1a3a4a]"
                        />
                      </div>

                      <div>
                        <Label htmlFor="city" className="text-gray-400 mb-1 block">
                          City
                        </Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => handleInputChange("city", e.target.value)}
                          disabled={!editMode}
                          className="bg-[#0f2d3c] border-[#1a3a4a]"
                        />
                      </div>

                      <div>
                        <Label htmlFor="country" className="text-gray-400 mb-1 block">
                          Country
                        </Label>
                        <Select
                          value={formData.country}
                          onValueChange={(value) => handleInputChange("country", value)}
                          disabled={!editMode}
                        >
                          <SelectTrigger className="bg-[#0f2d3c] border-[#1a3a4a]">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            <SelectItem value="VN">Vietnam</SelectItem>
                            <SelectItem value="US">United States</SelectItem>
                            <SelectItem value="UK">United Kingdom</SelectItem>
                            <SelectItem value="CA">Canada</SelectItem>
                            <SelectItem value="AU">Australia</SelectItem>
                            <SelectItem value="JP">Japan</SelectItem>
                            <SelectItem value="TW">Taiwan</SelectItem>
                            <SelectItem value="CN">China</SelectItem>
                            <SelectItem value="HK">Hong Kong</SelectItem>
                            <SelectItem value="SG">Singapore</SelectItem>
                            <SelectItem value="MY">Malaysia</SelectItem>
                            <SelectItem value="TH">Thailand</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-gray-400 mb-1">Title</p>
                        <p>{customerDetails?.pronoun || "N/A"}</p>
                      </div>

                      <div>
                        <p className="text-gray-400 mb-1">Email</p>
                        <p>{user.email}</p>
                      </div>

                      <div>
                        <p className="text-gray-400 mb-1">First Name</p>
                        <p>{customerDetails?.firstname || "N/A"}</p>
                      </div>

                      <div>
                        <p className="text-gray-400 mb-1">Last Name</p>
                        <p>{customerDetails?.lastname || "N/A"}</p>
                      </div>

                      <div>
                        <p className="text-gray-400 mb-1">Identity Card Number</p>
                        <p>{customerDetails?.identitycardnumber || "N/A"}</p>
                      </div>

                      <div>
                        <p className="text-gray-400 mb-1">Phone Number</p>
                        <p>{customerDetails?.phonenumber || "N/A"}</p>
                      </div>

                      <div>
                        <p className="text-gray-400 mb-1">Gender</p>
                        <p>
                          {customerDetails?.gender
                            ? customerDetails.gender.charAt(0).toUpperCase() + customerDetails.gender.slice(1)
                            : "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-400 mb-1">Nationality</p>
                        <p>{customerDetails?.nationality || "N/A"}</p>
                      </div>

                      <div>
                        <p className="text-gray-400 mb-1">Address</p>
                        <p>{customerDetails?.addressline || "N/A"}</p>
                      </div>

                      <div>
                        <p className="text-gray-400 mb-1">City</p>
                        <p>{customerDetails?.city || "N/A"}</p>
                      </div>

                      <div>
                        <p className="text-gray-400 mb-1">Country</p>
                        <p>{customerDetails?.country || "N/A"}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Points Tab */}
            <TabsContent value="points" className="pt-6">
              <div className="bg-[#0a1e29] rounded-lg p-6">
                <h3 className="text-xl font-bold mb-6">Points & Tier Status</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <div className="mb-6">
                      <p className="text-gray-400 mb-1">Current Points</p>
                      <p className="text-3xl font-bold text-[#9b6a4f]">{user.points.toLocaleString()}</p>
                    </div>

                    <div className="mb-6">
                      <p className="text-gray-400 mb-1">Current Tier</p>
                      <p className="text-3xl font-bold text-[#9b6a4f]">{user.tier}</p>
                    </div>

                    <div className="mb-6">
                      <p className="text-gray-400 mb-1">Tier Benefits</p>
                      <ul className="list-disc list-inside space-y-2 mt-2">
                        {user.tier === "Stratus" && (
                          <>
                            <li>Priority check-in</li>
                            <li>Extra baggage allowance (5kg)</li>
                            <li>10% bonus points on flights</li>
                          </>
                        )}
                        {user.tier === "Altostratus" && (
                          <>
                            <li>Priority check-in and boarding</li>
                            <li>Extra baggage allowance (10kg)</li>
                            <li>25% bonus points on flights</li>
                            <li>Access to airport lounges</li>
                            <li>Priority waitlist</li>
                          </>
                        )}
                        {user.tier === "Cirrus" && (
                          <>
                            <li>Priority check-in, boarding, and baggage handling</li>
                            <li>Extra baggage allowance (15kg)</li>
                            <li>50% bonus points on flights</li>
                            <li>Access to premium airport lounges</li>
                            <li>Priority waitlist and guaranteed seats</li>
                            <li>Complimentary upgrades (subject to availability)</li>
                            <li>Dedicated customer service line</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <div className="bg-[#0f2d3c] rounded-lg p-6">
                      <h4 className="text-lg font-bold mb-4">Tier Progress</h4>

                      <div className="mb-6">
                        <div className="flex justify-between mb-2">
                          <span>Stratus</span>
                          <span>Altostratus</span>
                          <span>Cirrus</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#9b6a4f]"
                            style={{
                              width: `${Math.min(100, (user.points / 10000) * 100)}%`,
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-gray-400">
                          <span>0</span>
                          <span>5,000</span>
                          <span>10,000</span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-gray-400 mb-1">Next Tier</p>
                        <p className="text-xl font-bold">
                          {user.tier === "Stratus"
                            ? "Altostratus"
                            : user.tier === "Altostratus"
                              ? "Cirrus"
                              : "You've reached the highest tier"}
                        </p>
                      </div>

                      <div className="mb-4">
                        <p className="text-gray-400 mb-1">Points Needed</p>
                        <p className="text-xl font-bold">
                          {user.tier === "Stratus"
                            ? (5000 - user.points).toLocaleString()
                            : user.tier === "Altostratus"
                              ? (10000 - user.points).toLocaleString()
                              : "0"}
                        </p>
                      </div>

                      <div>
                        <Button
                          className="bg-[#9b6a4f] hover:bg-[#9b6a4f]/90 w-full"
                          onClick={() => {
                            setShowPointHistory(true)
                            fetchPointHistory()
                          }}
                        >
                          View Point History
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Booking History Tab */}
            <TabsContent value="history" className="pt-6">
              <div className="bg-[#0a1e29] rounded-lg p-6">
                <h3 className="text-xl font-bold mb-6">Booking History</h3>

                {bookings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1a3a4a]">
                          <th className="text-left py-3 px-4">Flight</th>
                          <th className="text-left py-3 px-4">Route</th>
                          <th className="text-left py-3 px-4">Date</th>
                          <th className="text-left py-3 px-4">Status</th>
                          <th className="text-left py-3 px-4">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings
                          .sort((a, b) => new Date(b.departureDate).getTime() - new Date(a.departureDate).getTime())
                          .map((booking) => (
                          <tr key={booking.id} className="border-b border-[#1a3a4a]">
                            <td className="py-4 px-4">
                              <div className="flex items-center">
                                <Plane className="mr-2 h-4 w-4 text-[#9b6a4f]" />
                                {booking.flightNumber}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              {booking.departureAirport} → {booking.arrivalAirport}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center">
                                <Calendar className="mr-2 h-4 w-4 text-[#9b6a4f]" />
                                {booking.departureDate}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  booking.status === "Confirmed"
                                    ? "bg-green-500/20 text-green-500"
                                    : booking.status === "Cancelled"
                                      ? "bg-red-500/20 text-red-500"
                                      : "bg-yellow-500/20 text-yellow-500"
                                }`}
                              >
                                {booking.status}
                              </span>
                            </td>
                            <td className="py-4 px-4">{booking.price.toLocaleString()} VND</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-[#0f2d3c] rounded-lg">
                    <div className="mb-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mx-auto text-gray-500"
                      >
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-bold mb-2">No Bookings Found</h4>
                    <p className="text-gray-400 mb-6">You don't have any bookings in our system yet.</p>
                    <Link href="/">
                      <Button className="bg-[#9b6a4f] hover:bg-[#9b6a4f]/90">Book Your First Flight</Button>
                    </Link>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Point History Modal */}
        {showPointHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#0a1e29] rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Point History</h3>
                <button onClick={() => setShowPointHistory(false)} className="text-gray-400 hover:text-white">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {pointHistoryLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {pointHistory.map((transaction) => (
                    <div key={transaction.id} className="flex justify-between items-center p-4 bg-[#0f2d3c] rounded-lg">
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-gray-400">{format(new Date(transaction.date), "MMM dd, yyyy")}</p>
                      </div>
                      <div
                        className={`text-lg font-bold ${
                          transaction.type === "earned" ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {transaction.type === "earned" ? "+" : ""}
                        {transaction.points.toLocaleString()} pts
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-[#1a3a4a]">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Current Balance:</span>
                  <span className="text-xl font-bold text-[#9b6a4f]">{user.points.toLocaleString()} points</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
