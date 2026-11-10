import { config } from "dotenv"
import bcrypt from "bcryptjs"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

config({ path: ".env.local" })

const DAYS_OF_FLIGHTS = 90

const AIRPORTS = [
  { airportcode: "HAN", airportname: "Noi Bai International Airport", city: "Hanoi", country: "Vietnam" },
  { airportcode: "SGN", airportname: "Tan Son Nhat International Airport", city: "Ho Chi Minh City", country: "Vietnam" },
  { airportcode: "DAD", airportname: "Da Nang International Airport", city: "Da Nang", country: "Vietnam" },
  { airportcode: "CXR", airportname: "Cam Ranh International Airport", city: "Nha Trang", country: "Vietnam" },
  { airportcode: "PQC", airportname: "Phu Quoc International Airport", city: "Phu Quoc", country: "Vietnam" },
  { airportcode: "HPH", airportname: "Cat Bi International Airport", city: "Hai Phong", country: "Vietnam" },
  { airportcode: "HUI", airportname: "Phu Bai International Airport", city: "Hue", country: "Vietnam" },
  { airportcode: "DLI", airportname: "Lien Khuong Airport", city: "Da Lat", country: "Vietnam" },
]

const TICKET_CLASSES = [
  {
    classid: 1,
    classname: "Economy Saver",
    description: "Lowest fare with basic services",
    cabintype: "Economy",
    bookingcodeinfo: "A, E, P",
    seatselectioninfo: "Standard seat selection",
    checkedbagageinfo: "1 piece, 23kg",
    mileagemultiplier: 0.5,
    upgraderules: "Not permitted",
    reissuefeedefaultamount: 860000,
    refundfeedefaultamount: 860000,
  },
  {
    classid: 2,
    classname: "Economy Flex",
    description: "Flexible economy fare",
    cabintype: "Economy",
    bookingcodeinfo: "M, S, H, K, L",
    seatselectioninfo: "Free seat selection",
    checkedbagageinfo: "1 piece, 23kg",
    mileagemultiplier: 1,
    upgraderules: "Permitted with miles",
    reissuefeedefaultamount: 360000,
    refundfeedefaultamount: 500000,
  },
  {
    classid: 3,
    classname: "Premium Economy",
    description: "Extra legroom and priority services",
    cabintype: "Premium Economy",
    bookingcodeinfo: "W, Z, U",
    seatselectioninfo: "Free seat selection",
    checkedbagageinfo: "2 pieces, 23kg each",
    mileagemultiplier: 1.25,
    upgraderules: "Permitted with miles",
    reissuefeedefaultamount: 360000,
    refundfeedefaultamount: 360000,
  },
  {
    classid: 4,
    classname: "Business",
    description: "Business cabin with lounge access",
    cabintype: "Business",
    bookingcodeinfo: "J, C, D",
    seatselectioninfo: "Free seat selection",
    checkedbagageinfo: "2 pieces, 32kg each",
    mileagemultiplier: 1.5,
    upgraderules: "Permitted with miles",
    reissuefeedefaultamount: 0,
    refundfeedefaultamount: 360000,
  },
  {
    classid: 5,
    classname: "First Class",
    description: "Top cabin with full flexibility",
    cabintype: "First",
    bookingcodeinfo: "F, A",
    seatselectioninfo: "Free seat selection",
    checkedbagageinfo: "3 pieces, 32kg each",
    mileagemultiplier: 2,
    upgraderules: "Not applicable",
    reissuefeedefaultamount: 0,
    refundfeedefaultamount: 0,
  },
]

// Rows 1-29, seats A-F. The seat map greys out rows 3 and 13, so they are stored as blocked.
function classForRow(row: number): number {
  if (row <= 2) return 5
  if (row <= 6) return 4
  if (row <= 10) return 3
  if (row <= 18) return 2
  return 1
}

// [from, to, departure times, block minutes, miles, base price in VND]
const ROUTES: Array<[string, string, string[], number, number, number]> = [
  ["HAN", "SGN", ["06:00", "12:30", "19:15"], 130, 716, 1500000],
  ["SGN", "HAN", ["08:45", "15:00", "21:30"], 130, 716, 1500000],
  ["HAN", "DAD", ["07:10", "16:40"], 80, 391, 900000],
  ["DAD", "HAN", ["09:20", "18:50"], 80, 391, 900000],
  ["SGN", "DAD", ["06:30", "14:20"], 85, 377, 950000],
  ["DAD", "SGN", ["08:40", "16:30"], 85, 377, 950000],
  ["SGN", "PQC", ["10:15"], 60, 187, 800000],
  ["PQC", "SGN", ["12:20"], 60, 187, 800000],
  ["HAN", "CXR", ["11:05"], 110, 643, 1300000],
  ["CXR", "HAN", ["13:55"], 110, 643, 1300000],
  ["HAN", "PQC", ["09:30"], 130, 794, 1700000],
  ["PQC", "HAN", ["12:40"], 130, 794, 1700000],
]

const CLASS_PRICE_FACTOR: Record<number, number> = { 1: 1, 2: 1.3, 3: 1.8, 4: 3, 5: 4.5 }

const pad = (n: number) => String(n).padStart(2, "0")

function localTimestamp(day: Date, time: string, addMinutes = 0): string {
  const [h, m] = time.split(":").map(Number)
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m + addMinutes)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const db = drizzle(pool, { schema })

  await db.execute(sql`
    truncate table payments, tickets, passengers, bookings, sessions, users, customers,
      flightprices, flights, seats, airplanes, airplanetypes, ticketclasses, airports
    restart identity cascade
  `)

  await db.insert(schema.airports).values(AIRPORTS)
  await db
    .insert(schema.ticketclasses)
    .values(TICKET_CLASSES.map((c) => ({ ...c, reissuefeedefaultcurr: "VND", refundfeedefaultcurr: "VND" })))

  const seatRows: Array<{ seatnumber: string; classid: number; seattype: string }> = []
  for (let row = 1; row <= 29; row++) {
    for (const letter of ["A", "B", "C", "D", "E", "F"]) {
      const blocked = row === 3 || row === 13
      const seattype = blocked ? "blocked" : letter === "A" || letter === "F" ? "window" : letter === "C" || letter === "D" ? "aisle" : "middle"
      seatRows.push({ seatnumber: `${row}${letter}`, classid: classForRow(row), seattype })
    }
  }

  const [type] = await db
    .insert(schema.airplanetypes)
    .values({ modelname: "A321", manufacturer: "Airbus", totalseats: seatRows.length })
    .returning()

  await db.insert(schema.seats).values(seatRows.map((s) => ({ ...s, airplanetypeid: type.airplanetypeid })))

  const planes = await db
    .insert(schema.airplanes)
    .values(
      ["VN-A601", "VN-A602", "VN-A603", "VN-A604"].map((registrationnumber) => ({
        airplanetypeid: type.airplanetypeid,
        registrationnumber,
      })),
    )
    .returning()

  const today = new Date()
  const flightRows: Array<typeof schema.flights.$inferInsert> = []
  const basePrices: number[] = []
  for (let offset = -1; offset < DAYS_OF_FLIGHTS; offset++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)
    const weekend = day.getDay() === 0 || day.getDay() === 6
    ROUTES.forEach(([from, to, times, minutes, miles, base], routeIndex) => {
      times.forEach((time, timeIndex) => {
        flightRows.push({
          flightnumber: `CA${100 + routeIndex * 10 + timeIndex}`,
          departureairportcode: from,
          arrivalairportcode: to,
          departuredatetime: localTimestamp(day, time),
          arrivaldatetime: localTimestamp(day, time, minutes),
          status: "Scheduled",
          travelmiles: miles,
          airplaneid: planes[(routeIndex + timeIndex) % planes.length].airplaneid,
        })
        basePrices.push(Math.round((base * (weekend ? 1.15 : 1) * (1 + timeIndex * 0.05)) / 10000) * 10000)
      })
    })
  }

  const priceRows: Array<typeof schema.flightprices.$inferInsert> = []
  for (let i = 0; i < flightRows.length; i += 500) {
    const inserted = await db
      .insert(schema.flights)
      .values(flightRows.slice(i, i + 500))
      .returning({ flightid: schema.flights.flightid })
    inserted.forEach((f, j) => {
      for (const classid of [1, 2, 3, 4, 5]) {
        priceRows.push({
          flightid: f.flightid,
          classid,
          price: Math.round((basePrices[i + j] * CLASS_PRICE_FACTOR[classid]) / 10000) * 10000,
          currencycode: "VND",
        })
      }
    })
  }
  for (let i = 0; i < priceRows.length; i += 1000) {
    await db.insert(schema.flightprices).values(priceRows.slice(i, i + 1000))
  }

  const passwordhash = await bcrypt.hash("Password123!", 10)
  const people = [
    { firstname: "Test", lastname: "User", email: "test@example.com", role: "user", identitycardnumber: "001099000001" },
    { firstname: "Admin", lastname: "User", email: "admin@example.com", role: "admin", identitycardnumber: "001099000002" },
  ]
  for (const p of people) {
    const [customer] = await db
      .insert(schema.customers)
      .values({
        firstname: p.firstname,
        lastname: p.lastname,
        email: p.email,
        phonenumber: "0900000000",
        dateofbirth: "1990-01-01",
        gender: "Not specified",
        nationality: "Vietnam",
        identitycardnumber: p.identitycardnumber,
        pronoun: "Mr",
        country: "Vietnam",
        city: "Hanoi",
        addressline: "1 Example Street",
        contactname: `${p.firstname} ${p.lastname}`,
        contactemail: p.email,
        contactphone: "0900000000",
      })
      .returning()
    await db.insert(schema.users).values({
      customerid: customer.customerid,
      username: p.email,
      passwordhash,
      accountstatus: "verified",
      role: p.role,
    })
  }

  console.log(
    `Seeded ${AIRPORTS.length} airports, ${seatRows.length} seats, ${flightRows.length} flights, ${priceRows.length} prices, ${people.length} users`,
  )
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
