"use client"

import type React from "react"
import { useCallback, useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import { setLanguage as setLanguageAction } from "@/lib/store/slices/languageSlice"

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
    // Booking form translations
    roundTrip: "Round Trip",
    oneWay: "One Way",
    from: "From",
    to: "To",
    depart: "Depart",
    return: "Return",
    selectDate: "Select date",
    passengersAndClass: "Passengers & Class",
    searchFlights: "Search Flights",
    searching: "Searching...",
    selectDeparture: "Select departure",
    selectDestination: "Select destination",
    errorRequiredFields: "Please select departure, destination, and travel dates",
    errorReturnDate: "Please select a return date",
    errorCheckFlights: "Failed to check flight availability",
    // Passenger modal translations
    passengers: "Passengers",
    passengersSummary: "{count} Passenger",
    passengersSummaryPlural: "{count} Passengers",
    adults: "Adults",
    adultsAgeDescription: "Age 12+",
    children: "Children",
    childrenAgeDescription: "Age 2-11",
    infants: "Infants",
    infantsAgeDescription: "Under 2",
    cabinClass: "Cabin Class",
    selectCabinClass: "Select cabin class",
    economySaver: "Economy Saver",
    economyFlex: "Economy Flex",
    premiumEconomy: "Premium Economy",
    business: "Business",
    firstClass: "First Class",
    confirm: "Confirm",
    // Airport selector translations
    searchAirportOrCity: "Search airport or city...",
    noAirportsFound: "No airports found.",
    failedToLoadAirports: "Failed to load airports. Please try again.",
    // Button and UI component translations
    bookingStatus: "Booking Status",
    // Footer translations
    cloudAirlines: "Cloud Airlines",
    trustedPartner: "Your trusted partner for comfortable and reliable air travel.",
    quickLinks: "Quick Links",
    bookAFlight: "Book a Flight",
    checkIn: "Check-in",
    flightStatus: "Flight Status",
    manageBooking: "Manage Booking",
    contactUs: "Contact Us",
    faq: "FAQ",
    baggageInfo: "Baggage Info",
    travelGuidelines: "Travel Guidelines",
    connect: "Connect",
    newsletter: "Newsletter",
    socialMedia: "Social Media",
    mobileApp: "Mobile App",
    copyright: "© 2025 Cloud Airlines. All rights reserved."
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
    // Booking form translations
    roundTrip: "Khứ hồi",
    oneWay: "Một chiều",
    from: "Từ",
    to: "Đến",
    depart: "Khởi hành",
    return: "Trở về",
    selectDate: "Chọn ngày",
    passengersAndClass: "Hành khách & Hạng",
    searchFlights: "Tìm chuyến bay",
    searching: "Đang tìm...",
    selectDeparture: "Chọn điểm khởi hành",
    selectDestination: "Chọn điểm đến",
    errorRequiredFields: "Vui lòng chọn điểm khởi hành, điểm đến và ngày bay",
    errorReturnDate: "Vui lòng chọn ngày trở về",
    errorCheckFlights: "Không thể kiểm tra chuyến bay. Vui lòng thử lại",
    // Passenger modal translations
    passengers: "Hành khách",
    passengersSummary: "{count} Hành khách",
    passengersSummaryPlural: "{count} Hành khách",
    adults: "Người lớn",
    adultsAgeDescription: "Từ 12 tuổi trở lên",
    children: "Trẻ em",
    childrenAgeDescription: "2-11 tuổi",
    infants: "Em bé",
    infantsAgeDescription: "Dưới 2 tuổi",
    cabinClass: "Hạng ghế",
    selectCabinClass: "Chọn hạng ghế",
    economySaver: "Phổ thông Tiết kiệm",
    economyFlex: "Phổ thông Linh hoạt",
    premiumEconomy: "Phổ thông Đặc biệt",
    business: "Thương gia",
    firstClass: "Hạng nhất",
    confirm: "Xác nhận",
    // Airport selector translations
    searchAirportOrCity: "Tìm sân bay hoặc thành phố...",
    noAirportsFound: "Không tìm thấy sân bay nào.",
    failedToLoadAirports: "Không thể tải danh sách sân bay. Vui lòng thử lại.",
    // Button and UI component translations
    bookingStatus: "Trạng thái đặt chỗ",
    // Footer translations
    cloudAirlines: "Cloud Airlines",
    trustedPartner: "Đối tác tin cậy của bạn cho các chuyến bay thoải mái và đáng tin cậy.",
    quickLinks: "Liên kết nhanh",
    bookAFlight: "Đặt chuyến bay",
    checkIn: "Làm thủ tục",
    flightStatus: "Trạng thái chuyến bay",
    manageBooking: "Quản lý đặt chỗ",
    contactUs: "Liên hệ với chúng tôi",
    faq: "Câu hỏi thường gặp",
    baggageInfo: "Thông tin hành lý",
    travelGuidelines: "Hướng dẫn du lịch",
    connect: "Kết nối",
    newsletter: "Bản tin",
    socialMedia: "Mạng xã hội",
    mobileApp: "Ứng dụng di động",
    copyright: "© 2025 Cloud Airlines. Tất cả các quyền được bảo lưu."
  },
}

const LANGUAGE_COOKIE = "language"

// The language lives in the Redux store; the preference is remembered in a cookie
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    // Load language preference from the cookie if available
    const savedLanguage = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${LANGUAGE_COOKIE}=`))
      ?.split("=")[1] as Language | undefined
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "vi")) {
      dispatch(setLanguageAction(savedLanguage))
    }
  }, [dispatch])

  return <>{children}</>
}

export function useLanguage(): LanguageContextType {
  const dispatch = useAppDispatch()
  const language = useAppSelector((state) => state.language)

  const setLanguage = useCallback(
    (lang: Language) => {
      dispatch(setLanguageAction(lang))
      document.cookie = `${LANGUAGE_COOKIE}=${lang};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`
    },
    [dispatch],
  )

  const t = useCallback(
    (key: string): string => {
      return translations[language][key as keyof typeof translations.en] || key
    },
    [language],
  )

  return { language, setLanguage, t }
}
