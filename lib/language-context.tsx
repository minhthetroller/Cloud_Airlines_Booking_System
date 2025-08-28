"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type Language = "en" | "vi"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  en: {
    home: "Home",
    myBookings: "My Bookings",
    cosmile: "COSMILE",
    support: "Support",
    signIn: "Sign In",
    register: "Register",
    bookYourFlight: "Book Your Flight",
    findBestDeals: "Find the best deals on flights to your favorite destinations",
    specialOffers: "Special Offers",
    discoverPromotions: "Discover our latest promotions and discounts on flights worldwide.",
    viewOffers: "View Offers",
    travelDestinations: "Travel Destinations",
    exploreDestinations: "Explore popular destinations and get inspired for your next trip.",
    explore: "Explore",
    travelGuide: "Travel Guide",
    helpfulTips: "Get helpful tips and information to make your journey smoother.",
    readMore: "Read More",
    accountCenter: "Account Center",
    language: "Language",
    signOut: "Sign Out",
  },
  vi: {
    home: "Trang chủ",
    myBookings: "Đặt chỗ của tôi",
    cosmile: "COSMILE",
    support: "Hỗ trợ",
    signIn: "Đăng nhập",
    register: "Đăng ký",
    bookYourFlight: "Đặt chuyến bay",
    findBestDeals: "Tìm các ưu đãi tốt nhất cho chuyến bay đến điểm đến yêu thích của bạn",
    specialOffers: "Ưu đãi đặc biệt",
    discoverPromotions: "Khám phá các khuyến mãi và giảm giá mới nhất cho các chuyến bay trên toàn thế giới.",
    viewOffers: "Xem ưu đãi",
    travelDestinations: "Điểm đến du lịch",
    exploreDestinations: "Khám phá các điểm đến phổ biến và lấy cảm hứng cho chuyến đi tiếp theo của bạn.",
    explore: "Khám phá",
    travelGuide: "Hướng dẫn du lịch",
    helpfulTips: "Nhận các mẹo và thông tin hữu ích để chuyến đi của bạn suôn sẻ hơn.",
    readMore: "Đọc thêm",
    accountCenter: "Trung tâm tài khoản",
    language: "Ngôn ngữ",
    signOut: "Đăng xuất",
  },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")

  useEffect(() => {
    // Load language preference from localStorage if available
    const savedLanguage = localStorage.getItem("language") as Language
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "vi")) {
      setLanguageState(savedLanguage)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("language", lang)
  }

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
