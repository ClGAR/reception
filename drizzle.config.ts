import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Migrations use the DIRECT (unpooled) connection.
export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED! },
  strict: true,
});
