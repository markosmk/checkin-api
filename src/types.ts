import type { JWTPayload } from "hono/utils/jwt/types"
import type * as schema from "./db/schema"
import type { DrizzleD1Database } from "drizzle-orm/d1"
import type { BookingStatus } from "./db/enum"
import type { MercadoPagoConfig } from "mercadopago"
// import type * as schemaPG from "./db/schema.pg"
// import type { NodePgDatabase } from "drizzle-orm/node-postgres"

export type DB = DrizzleD1Database<typeof schema>
// export type DBPG = NodePgDatabase<typeof schemaPG>

/** used in public routes, to send in bearer token */
export interface TokenPayload {
  booking: {
    id: string
    // reservationId: string
    checkin: string
    status: BookingStatus
    maxPaxs: number | null
  }
  hotel: {
    id?: string
    name: string
    slug: string
  }
}

export type App = {
  Bindings: Env // Env is generate with comand pn wrangler types (include bindings d1, with name DB_D1)
  Variables: {
    db: DB // -> sqlite / D1
    // dbPG: DBPG // -> Posgress
    // dbTEST: DBTEST // -> Testing
    user: schema.User
    session: schema.Session
    subscription: schema.Subscription
    mercadopago: MercadoPagoConfig
    // booking: { id: string; checkin: string; checkout?: string; status: BookingStatus; maxPaxs: number | null }
    // hotel: { id?: string; slug: string; name: string }
  } & TokenPayload
}

/** used in internal site panel, as additional bearer token if cookies is not working.. */
export type CustomPayload = {
  sub: string
  sessionToken: string
} & JWTPayload
