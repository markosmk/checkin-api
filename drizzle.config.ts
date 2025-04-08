import type { Config } from "drizzle-kit"

export default {
  // to postgres
  // schema: "src/db/schema.ts",
  // out: "drizzle/migrations",
  // dialect: "postgresql",
  // to d1 sqlite
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  // driver: "d1-http",
} satisfies Config
