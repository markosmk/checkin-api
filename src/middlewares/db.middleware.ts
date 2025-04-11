import * as schema from "../db/schema"
import { drizzle } from "drizzle-orm/d1"
// import { drizzle } from "drizzle-orm/node-postgres"
import { createFactory } from "hono/factory"
import { App } from "../types"
import type { Context, Next } from "hono"

const factory = createFactory<App>({
  // initApp: (app) => {
  //   app.use(async (c, next) => {
  //     c.set("db", drizzle(c.env.DB_D1, { schema }))
  //     await next()
  //   })
  // },
})
// const app = factory.createApp()

export const dbMiddleware = factory.createMiddleware(async (c: Context, next: Next) => {
  let db = c.get("db")
  if (!db) {
    db = drizzle(c.env.DB_D1, { schema })
    c.set("db", db)
  }
  // return db
  await next()
})
