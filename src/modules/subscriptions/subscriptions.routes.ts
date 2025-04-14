import { Hono } from "hono"
import type { App } from "../../types"
import { zValidator } from "@hono/zod-validator"
import * as svc from "./subscriptions.service"
import { CancelSubscriptionSchema } from "./subscriptions.schema"
import { requireActiveSubscription, requireCanceledSubscription } from "./subscriptions.guard"
import { z } from "zod"
import { BillingCycle, SubscriptionPlan } from "../../db/enum"

const app = new Hono<App>()

app.get("/current", async (c) => {
  const userId = c.get("session").userId
  const db = c.get("db")
  const sub = await svc.getCurrentSubscription(db, userId)
  return c.json(sub || { plan: "free", status: "active" })
})

app.post(
  "/create-checkout",
  zValidator("json", z.object({ plan: z.nativeEnum(SubscriptionPlan), billingCycle: z.nativeEnum(BillingCycle) })),
  async (c) => {
    const userId = c.get("session").userId
    const email = c.get("user").email
    const data = c.req.valid("json")
    const db = c.get("db")
    const checkout = await svc.createCheckout(c.env, db, userId, email, data)
    return c.json(checkout)
  }
)

app.post("/cancel", zValidator("json", CancelSubscriptionSchema), requireActiveSubscription, async (c) => {
  const userId = c.get("session").userId
  const db = c.get("db")
  const data = c.req.valid("json")
  const canceled = await svc.cancelSubscription(db, userId, data)
  return c.json(canceled)
})

// if suscriution was cancelled, but yet in valid period, then we can reactivate it.
app.post("/reactivate", requireCanceledSubscription, async (c) => {
  const userId = c.get("session").userId
  const db = c.get("db")
  const reactivated = await svc.reactivateSubscription(db, userId)
  return c.json(reactivated)
})

app.get("/history", async (c) => {
  const userId = c.get("session").userId
  const db = c.get("db")
  const history = await svc.getSubscriptionHistory(db, userId)
  return c.json(history)
})

export default app
