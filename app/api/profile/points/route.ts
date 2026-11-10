import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { bookings } from "@/lib/db/schema"
import { requireUser } from "@/lib/server/auth"
import { route } from "@/lib/server/http"

export const dynamic = "force-dynamic"

export const GET = route(async () => {
  const session = await requireUser()

  const rows = await db
    .select({
      bookingid: bookings.bookingid,
      bookingdatetime: bookings.bookingdatetime,
      bookingreference: bookings.bookingreference,
      totalprice: bookings.totalprice,
    })
    .from(bookings)
    .where(eq(bookings.userid, session.userId))
    .orderBy(desc(bookings.bookingdatetime))

  const pointHistory = rows.map((booking) => ({
    id: booking.bookingid,
    date: booking.bookingdatetime,
    description: `Flight booking - ${booking.bookingreference}`,
    points: Math.floor(booking.totalprice / 500000),
    type: "earned",
  }))

  return { pointHistory }
})
