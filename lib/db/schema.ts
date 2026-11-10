import { sql } from "drizzle-orm"
import {
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core"

// Money and mileage values are read as JS numbers, matching what the UI already expects
const money = (name: string) => numeric(name, { precision: 14, scale: 2, mode: "number" })
const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" })
// Flight times are airport-local wall clock values, as the UI has always treated them
const localtime = (name: string) => timestamp(name, { withTimezone: false, mode: "string" })

export const bookingStatus = pgEnum("booking_status", ["Pending", "Confirmed", "Cancelled", "Expired"])
export const paymentStatus = pgEnum("payment_status", ["Pending", "Completed", "Cancelled", "Expired"])
export const ticketStatus = pgEnum("ticket_status", ["Pending", "Confirmed", "Cancelled"])
export const passengerType = pgEnum("passenger_type", ["Adult", "Child", "Infant"])

export const airports = pgTable("airports", {
  airportcode: varchar("airportcode", { length: 3 }).primaryKey(),
  airportname: text("airportname").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
})

export const airplanetypes = pgTable("airplanetypes", {
  airplanetypeid: serial("airplanetypeid").primaryKey(),
  modelname: text("modelname").notNull(),
  manufacturer: text("manufacturer").notNull(),
  totalseats: integer("totalseats").notNull(),
})

export const airplanes = pgTable("airplanes", {
  airplaneid: serial("airplaneid").primaryKey(),
  airplanetypeid: integer("airplanetypeid")
    .notNull()
    .references(() => airplanetypes.airplanetypeid),
  registrationnumber: text("registrationnumber"),
})

export const ticketclasses = pgTable("ticketclasses", {
  classid: integer("classid").primaryKey(),
  classname: text("classname").notNull(),
  description: text("description"),
  cabintype: text("cabintype"),
  bookingcodeinfo: text("bookingcodeinfo"),
  seatselectioninfo: text("seatselectioninfo"),
  checkedbagageinfo: text("checkedbagageinfo"),
  mileagemultiplier: numeric("mileagemultiplier", { precision: 5, scale: 2, mode: "number" }).notNull().default(1),
  upgraderules: text("upgraderules"),
  reissuefeedefaultamount: money("reissuefeedefaultamount"),
  reissuefeedefaultcurr: varchar("reissuefeedefaultcurr", { length: 3 }),
  refundfeedefaultamount: money("refundfeedefaultamount"),
  refundfeedefaultcurr: varchar("refundfeedefaultcurr", { length: 3 }),
})

// Seat template per aircraft type. Whether a seat is taken on a flight is derived from tickets.
export const seats = pgTable(
  "seats",
  {
    seatid: serial("seatid").primaryKey(),
    airplanetypeid: integer("airplanetypeid")
      .notNull()
      .references(() => airplanetypes.airplanetypeid),
    seatnumber: varchar("seatnumber", { length: 4 }).notNull(),
    classid: integer("classid")
      .notNull()
      .references(() => ticketclasses.classid),
    seattype: text("seattype").notNull().default("standard"),
  },
  (t) => [
    uniqueIndex("seats_type_number_uq").on(t.airplanetypeid, t.seatnumber),
    index("seats_type_class_idx").on(t.airplanetypeid, t.classid),
  ],
)

export const flights = pgTable(
  "flights",
  {
    flightid: serial("flightid").primaryKey(),
    flightnumber: varchar("flightnumber", { length: 10 }).notNull(),
    departureairportcode: varchar("departureairportcode", { length: 3 })
      .notNull()
      .references(() => airports.airportcode),
    arrivalairportcode: varchar("arrivalairportcode", { length: 3 })
      .notNull()
      .references(() => airports.airportcode),
    departuredatetime: localtime("departuredatetime").notNull(),
    arrivaldatetime: localtime("arrivaldatetime").notNull(),
    status: text("status").notNull().default("Scheduled"),
    travelmiles: integer("travelmiles"),
    airplaneid: integer("airplaneid")
      .notNull()
      .references(() => airplanes.airplaneid),
  },
  (t) => [index("flights_route_departure_idx").on(t.departureairportcode, t.arrivalairportcode, t.departuredatetime)],
)

export const flightprices = pgTable(
  "flightprices",
  {
    flightpriceid: serial("flightpriceid").primaryKey(),
    flightid: integer("flightid")
      .notNull()
      .references(() => flights.flightid, { onDelete: "cascade" }),
    classid: integer("classid")
      .notNull()
      .references(() => ticketclasses.classid),
    price: money("price").notNull(),
    currencycode: varchar("currencycode", { length: 3 }).notNull().default("VND"),
  },
  (t) => [uniqueIndex("flightprices_flight_class_uq").on(t.flightid, t.classid)],
)

export const customers = pgTable(
  "customers",
  {
    customerid: serial("customerid").primaryKey(),
    firstname: text("firstname").notNull(),
    lastname: text("lastname").notNull(),
    email: text("email"),
    phonenumber: text("phonenumber"),
    dateofbirth: date("dateofbirth", { mode: "string" }),
    gender: text("gender"),
    nationality: text("nationality"),
    passportnumber: text("passportnumber"),
    passportexpiry: date("passportexpiry", { mode: "string" }),
    identitycardnumber: text("identitycardnumber"),
    pronoun: text("pronoun"),
    country: text("country"),
    city: text("city"),
    addressline: text("addressline"),
    contactname: text("contactname"),
    contactemail: text("contactemail"),
    contactphone: text("contactphone"),
  },
  (t) => [
    uniqueIndex("customers_identitycard_uq")
      .on(t.identitycardnumber)
      .where(sql`${t.identitycardnumber} is not null and ${t.identitycardnumber} <> ''`),
    index("customers_passport_idx").on(t.passportnumber),
    index("customers_email_idx").on(t.email),
  ],
)

export const users = pgTable(
  "users",
  {
    userid: serial("userid").primaryKey(),
    customerid: integer("customerid")
      .notNull()
      .references(() => customers.customerid),
    username: text("username").notNull(),
    passwordhash: text("passwordhash").notNull().default(""),
    pointsavailable: integer("pointsavailable").notNull().default(0),
    accountstatus: text("accountstatus").notNull().default("unverified"),
    role: text("role").notNull().default("user"),
    dateregistered: timestamptz("dateregistered").notNull().defaultNow(),
    verification_token: text("verification_token"),
    reset_token: text("reset_token"),
    reset_expires: timestamptz("reset_expires"),
  },
  (t) => [uniqueIndex("users_username_uq").on(t.username)],
)

export const sessions = pgTable(
  "sessions",
  {
    sessionid: serial("sessionid").primaryKey(),
    userid: integer("userid")
      .notNull()
      .references(() => users.userid, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expires: timestamptz("expires").notNull(),
  },
  (t) => [uniqueIndex("sessions_token_uq").on(t.token), index("sessions_user_idx").on(t.userid)],
)

export const bookings = pgTable(
  "bookings",
  {
    bookingid: serial("bookingid").primaryKey(),
    bookingdatetime: timestamptz("bookingdatetime").notNull().defaultNow(),
    bookingstatus: bookingStatus("bookingstatus").notNull().default("Pending"),
    totalprice: money("totalprice").notNull(),
    currencycode: varchar("currencycode", { length: 3 }).notNull().default("VND"),
    bookingreference: varchar("bookingreference", { length: 6 }).notNull(),
    userid: integer("userid").references(() => users.userid),
    // A Pending booking keeps its seats only until this moment
    expiresat: timestamptz("expiresat"),
  },
  (t) => [
    uniqueIndex("bookings_reference_uq").on(t.bookingreference),
    index("bookings_user_datetime_idx").on(t.userid, t.bookingdatetime),
    index("bookings_pending_expiry_idx").on(t.expiresat).where(sql`${t.bookingstatus} = 'Pending'`),
  ],
)

export const passengers = pgTable(
  "passengers",
  {
    passengerid: serial("passengerid").primaryKey(),
    customerid: integer("customerid")
      .notNull()
      .references(() => customers.customerid),
    bookingid: integer("bookingid")
      .notNull()
      .references(() => bookings.bookingid, { onDelete: "cascade" }),
    passengertype: passengerType("passengertype").notNull().default("Adult"),
  },
  (t) => [index("passengers_booking_idx").on(t.bookingid), index("passengers_customer_idx").on(t.customerid)],
)

export const tickets = pgTable(
  "tickets",
  {
    ticketid: serial("ticketid").primaryKey(),
    bookingid: integer("bookingid")
      .notNull()
      .references(() => bookings.bookingid, { onDelete: "cascade" }),
    flightid: integer("flightid")
      .notNull()
      .references(() => flights.flightid),
    passengerid: integer("passengerid")
      .notNull()
      .references(() => passengers.passengerid, { onDelete: "cascade" }),
    seatid: integer("seatid")
      .notNull()
      .references(() => seats.seatid),
    classid: integer("classid")
      .notNull()
      .references(() => ticketclasses.classid),
    status: ticketStatus("status").notNull().default("Pending"),
    ticketprice: money("ticketprice").notNull(),
    ticketnumber: varchar("ticketnumber", { length: 12 }).notNull(),
  },
  (t) => [
    // A seat on a flight belongs to at most one live ticket. This replaces flightseatoccupancy.
    uniqueIndex("tickets_flight_seat_active_uq").on(t.flightid, t.seatid).where(sql`${t.status} <> 'Cancelled'`),
    uniqueIndex("tickets_number_uq").on(t.ticketnumber),
    index("tickets_booking_idx").on(t.bookingid),
    index("tickets_passenger_idx").on(t.passengerid),
  ],
)

export const payments = pgTable(
  "payments",
  {
    paymentid: serial("paymentid").primaryKey(),
    bookingid: integer("bookingid")
      .notNull()
      .references(() => bookings.bookingid, { onDelete: "cascade" }),
    paymentdatetime: timestamptz("paymentdatetime").notNull().defaultNow(),
    amount: money("amount").notNull(),
    currencycode: varchar("currencycode", { length: 3 }).notNull().default("VND"),
    paymentmethod: text("paymentmethod").notNull().default("Credit Card"),
    paymentstatus: paymentStatus("paymentstatus").notNull().default("Pending"),
    transactionid: text("transactionid"),
    stripesessionid: text("stripesessionid"),
  },
  (t) => [
    index("payments_booking_idx").on(t.bookingid, t.paymentdatetime),
    uniqueIndex("payments_transaction_uq").on(t.transactionid),
    uniqueIndex("payments_stripe_session_uq").on(t.stripesessionid),
  ],
)
