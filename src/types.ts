import { JWTPayload } from "hono/utils/jwt/types"
import type * as schema from "./db/schema"
import type { DrizzleD1Database } from "drizzle-orm/d1"

// import type * as schemaPG from "./db/schema.pg"
// import type { NodePgDatabase } from "drizzle-orm/node-postgres"

export type DB = DrizzleD1Database<typeof schema>
// export type DBPG = NodePgDatabase<typeof schemaPG>

export type App = {
  Bindings: Env // Env is generate with comand pn wrangler types (include bindings d1, with name DB_D1)
  Variables: {
    db: DB // -> sqlite / D1
    // dbPG: DBPG // -> Posgress
    // dbTEST: DBTEST // -> Testing
    user: schema.User
    session: schema.Session
  }
}

export type CustomPayload = {
  sub: string
  sessionToken: string
} & JWTPayload
