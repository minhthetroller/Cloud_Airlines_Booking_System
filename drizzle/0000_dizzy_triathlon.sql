CREATE TYPE "public"."booking_status" AS ENUM('Pending', 'Confirmed', 'Cancelled', 'Expired');--> statement-breakpoint
CREATE TYPE "public"."passenger_type" AS ENUM('Adult', 'Child', 'Infant');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('Pending', 'Completed', 'Cancelled', 'Expired');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('Pending', 'Confirmed', 'Cancelled');--> statement-breakpoint
CREATE TABLE "airplanes" (
	"airplaneid" serial PRIMARY KEY NOT NULL,
	"airplanetypeid" integer NOT NULL,
	"registrationnumber" text
);
--> statement-breakpoint
CREATE TABLE "airplanetypes" (
	"airplanetypeid" serial PRIMARY KEY NOT NULL,
	"modelname" text NOT NULL,
	"manufacturer" text NOT NULL,
	"totalseats" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "airports" (
	"airportcode" varchar(3) PRIMARY KEY NOT NULL,
	"airportname" text NOT NULL,
	"city" text NOT NULL,
	"country" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"bookingid" serial PRIMARY KEY NOT NULL,
	"bookingdatetime" timestamp with time zone DEFAULT now() NOT NULL,
	"bookingstatus" "booking_status" DEFAULT 'Pending' NOT NULL,
	"totalprice" numeric(14, 2) NOT NULL,
	"currencycode" varchar(3) DEFAULT 'VND' NOT NULL,
	"bookingreference" varchar(6) NOT NULL,
	"userid" integer,
	"expiresat" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"customerid" serial PRIMARY KEY NOT NULL,
	"firstname" text NOT NULL,
	"lastname" text NOT NULL,
	"email" text,
	"phonenumber" text,
	"dateofbirth" date,
	"gender" text,
	"nationality" text,
	"passportnumber" text,
	"passportexpiry" date,
	"identitycardnumber" text,
	"pronoun" text,
	"country" text,
	"city" text,
	"addressline" text,
	"contactname" text,
	"contactemail" text,
	"contactphone" text
);
--> statement-breakpoint
CREATE TABLE "flightprices" (
	"flightpriceid" serial PRIMARY KEY NOT NULL,
	"flightid" integer NOT NULL,
	"classid" integer NOT NULL,
	"price" numeric(14, 2) NOT NULL,
	"currencycode" varchar(3) DEFAULT 'VND' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flights" (
	"flightid" serial PRIMARY KEY NOT NULL,
	"flightnumber" varchar(10) NOT NULL,
	"departureairportcode" varchar(3) NOT NULL,
	"arrivalairportcode" varchar(3) NOT NULL,
	"departuredatetime" timestamp NOT NULL,
	"arrivaldatetime" timestamp NOT NULL,
	"status" text DEFAULT 'Scheduled' NOT NULL,
	"travelmiles" integer,
	"airplaneid" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passengers" (
	"passengerid" serial PRIMARY KEY NOT NULL,
	"customerid" integer NOT NULL,
	"bookingid" integer NOT NULL,
	"passengertype" "passenger_type" DEFAULT 'Adult' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"paymentid" serial PRIMARY KEY NOT NULL,
	"bookingid" integer NOT NULL,
	"paymentdatetime" timestamp with time zone DEFAULT now() NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currencycode" varchar(3) DEFAULT 'VND' NOT NULL,
	"paymentmethod" text DEFAULT 'Credit Card' NOT NULL,
	"paymentstatus" "payment_status" DEFAULT 'Pending' NOT NULL,
	"transactionid" text,
	"stripesessionid" text
);
--> statement-breakpoint
CREATE TABLE "seats" (
	"seatid" serial PRIMARY KEY NOT NULL,
	"airplanetypeid" integer NOT NULL,
	"seatnumber" varchar(4) NOT NULL,
	"classid" integer NOT NULL,
	"seattype" text DEFAULT 'standard' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sessionid" serial PRIMARY KEY NOT NULL,
	"userid" integer NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticketclasses" (
	"classid" integer PRIMARY KEY NOT NULL,
	"classname" text NOT NULL,
	"description" text,
	"cabintype" text,
	"bookingcodeinfo" text,
	"seatselectioninfo" text,
	"checkedbagageinfo" text,
	"mileagemultiplier" numeric(5, 2) DEFAULT 1 NOT NULL,
	"upgraderules" text,
	"reissuefeedefaultamount" numeric(14, 2),
	"reissuefeedefaultcurr" varchar(3),
	"refundfeedefaultamount" numeric(14, 2),
	"refundfeedefaultcurr" varchar(3)
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"ticketid" serial PRIMARY KEY NOT NULL,
	"bookingid" integer NOT NULL,
	"flightid" integer NOT NULL,
	"passengerid" integer NOT NULL,
	"seatid" integer NOT NULL,
	"classid" integer NOT NULL,
	"status" "ticket_status" DEFAULT 'Pending' NOT NULL,
	"ticketprice" numeric(14, 2) NOT NULL,
	"ticketnumber" varchar(12) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"userid" serial PRIMARY KEY NOT NULL,
	"customerid" integer NOT NULL,
	"username" text NOT NULL,
	"passwordhash" text DEFAULT '' NOT NULL,
	"pointsavailable" integer DEFAULT 0 NOT NULL,
	"accountstatus" text DEFAULT 'unverified' NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"dateregistered" timestamp with time zone DEFAULT now() NOT NULL,
	"verification_token" text,
	"reset_token" text,
	"reset_expires" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "airplanes" ADD CONSTRAINT "airplanes_airplanetypeid_airplanetypes_airplanetypeid_fk" FOREIGN KEY ("airplanetypeid") REFERENCES "public"."airplanetypes"("airplanetypeid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_userid_users_userid_fk" FOREIGN KEY ("userid") REFERENCES "public"."users"("userid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flightprices" ADD CONSTRAINT "flightprices_flightid_flights_flightid_fk" FOREIGN KEY ("flightid") REFERENCES "public"."flights"("flightid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flightprices" ADD CONSTRAINT "flightprices_classid_ticketclasses_classid_fk" FOREIGN KEY ("classid") REFERENCES "public"."ticketclasses"("classid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flights" ADD CONSTRAINT "flights_departureairportcode_airports_airportcode_fk" FOREIGN KEY ("departureairportcode") REFERENCES "public"."airports"("airportcode") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flights" ADD CONSTRAINT "flights_arrivalairportcode_airports_airportcode_fk" FOREIGN KEY ("arrivalairportcode") REFERENCES "public"."airports"("airportcode") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flights" ADD CONSTRAINT "flights_airplaneid_airplanes_airplaneid_fk" FOREIGN KEY ("airplaneid") REFERENCES "public"."airplanes"("airplaneid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passengers" ADD CONSTRAINT "passengers_customerid_customers_customerid_fk" FOREIGN KEY ("customerid") REFERENCES "public"."customers"("customerid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passengers" ADD CONSTRAINT "passengers_bookingid_bookings_bookingid_fk" FOREIGN KEY ("bookingid") REFERENCES "public"."bookings"("bookingid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingid_bookings_bookingid_fk" FOREIGN KEY ("bookingid") REFERENCES "public"."bookings"("bookingid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_airplanetypeid_airplanetypes_airplanetypeid_fk" FOREIGN KEY ("airplanetypeid") REFERENCES "public"."airplanetypes"("airplanetypeid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_classid_ticketclasses_classid_fk" FOREIGN KEY ("classid") REFERENCES "public"."ticketclasses"("classid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userid_users_userid_fk" FOREIGN KEY ("userid") REFERENCES "public"."users"("userid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_bookingid_bookings_bookingid_fk" FOREIGN KEY ("bookingid") REFERENCES "public"."bookings"("bookingid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_flightid_flights_flightid_fk" FOREIGN KEY ("flightid") REFERENCES "public"."flights"("flightid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_passengerid_passengers_passengerid_fk" FOREIGN KEY ("passengerid") REFERENCES "public"."passengers"("passengerid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_seatid_seats_seatid_fk" FOREIGN KEY ("seatid") REFERENCES "public"."seats"("seatid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_classid_ticketclasses_classid_fk" FOREIGN KEY ("classid") REFERENCES "public"."ticketclasses"("classid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_customerid_customers_customerid_fk" FOREIGN KEY ("customerid") REFERENCES "public"."customers"("customerid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_reference_uq" ON "bookings" USING btree ("bookingreference");--> statement-breakpoint
CREATE INDEX "bookings_user_datetime_idx" ON "bookings" USING btree ("userid","bookingdatetime");--> statement-breakpoint
CREATE INDEX "bookings_pending_expiry_idx" ON "bookings" USING btree ("expiresat") WHERE "bookings"."bookingstatus" = 'Pending';--> statement-breakpoint
CREATE UNIQUE INDEX "customers_identitycard_uq" ON "customers" USING btree ("identitycardnumber") WHERE "customers"."identitycardnumber" is not null and "customers"."identitycardnumber" <> '';--> statement-breakpoint
CREATE INDEX "customers_passport_idx" ON "customers" USING btree ("passportnumber");--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "flightprices_flight_class_uq" ON "flightprices" USING btree ("flightid","classid");--> statement-breakpoint
CREATE INDEX "flights_route_departure_idx" ON "flights" USING btree ("departureairportcode","arrivalairportcode","departuredatetime");--> statement-breakpoint
CREATE INDEX "passengers_booking_idx" ON "passengers" USING btree ("bookingid");--> statement-breakpoint
CREATE INDEX "passengers_customer_idx" ON "passengers" USING btree ("customerid");--> statement-breakpoint
CREATE INDEX "payments_booking_idx" ON "payments" USING btree ("bookingid","paymentdatetime");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_transaction_uq" ON "payments" USING btree ("transactionid");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_stripe_session_uq" ON "payments" USING btree ("stripesessionid");--> statement-breakpoint
CREATE UNIQUE INDEX "seats_type_number_uq" ON "seats" USING btree ("airplanetypeid","seatnumber");--> statement-breakpoint
CREATE INDEX "seats_type_class_idx" ON "seats" USING btree ("airplanetypeid","classid");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_uq" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("userid");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_flight_seat_active_uq" ON "tickets" USING btree ("flightid","seatid") WHERE "tickets"."status" <> 'Cancelled';--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_number_uq" ON "tickets" USING btree ("ticketnumber");--> statement-breakpoint
CREATE INDEX "tickets_booking_idx" ON "tickets" USING btree ("bookingid");--> statement-breakpoint
CREATE INDEX "tickets_passenger_idx" ON "tickets" USING btree ("passengerid");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_uq" ON "users" USING btree ("username");