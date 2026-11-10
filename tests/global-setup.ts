import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Client, Pool } from "pg"

const ADMIN_URL = "postgres://cabs:cabs@localhost:5433/cabs"
const TEST_URL = "postgres://cabs:cabs@localhost:5433/cabs_test"

// Rebuilds the cabs_test database from the migrations before the test run
export default async function setup() {
  const admin = new Client({ connectionString: ADMIN_URL })
  await admin.connect()
  await admin.query("drop database if exists cabs_test with (force)")
  await admin.query("create database cabs_test")
  await admin.end()

  const pool = new Pool({ connectionString: TEST_URL })
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" })
  await pool.end()
}
