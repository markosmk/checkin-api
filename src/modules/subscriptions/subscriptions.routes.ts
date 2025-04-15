import { Hono } from "hono"
import type { App } from "../../types"
import { zValidator } from "@hono/zod-validator"
import * as svc from "./subscriptions.service"
import * as mpService from "../common/mp.service"
import { CancelSubscriptionSchema } from "./subscriptions.schema"
import { requireActiveSubscription, requireCanceledSubscription } from "./subscriptions.guard"
import { z } from "zod"
import { BillingCycle, SubscriptionPlan } from "../../db/enum"
import { PRICES, Currency } from "../../config/prices"
import { withMercadoPago } from "../../middlewares/mp.middleware"

const appSub = new Hono<App>()

appSub.use(withMercadoPago)

appSub.get("/current", async (c) => {
  const userId = c.get("session").userId
  const db = c.get("db")
  const sub = await svc.getCurrentSubscription(db, userId)
  return c.json(sub || { plan: "free", status: "active" })
})

appSub.post(
  "/subscribe",
  zValidator(
    "json",
    z.object({
      billingCycle: z.nativeEnum(BillingCycle),
      plan: z.nativeEnum(SubscriptionPlan),
      currency: z.nativeEnum(Currency),
    })
  ),
  async (c) => {
    const userId = c.get("session").userId
    const email = c.get("user").email
    const input = c.req.valid("json")
    const db = c.get("db")
    const mpClient = c.get("mercadopago")
    // plan selected
    const plan = {
      type: input.plan,
      billingCycle: input.billingCycle,
      price: PRICES[input.plan][input.currency][input.billingCycle],
    }
    // create link
    const subMp = await mpService.subscribe(mpClient, c.env, userId, email, plan)
    // create sub local pending
    // TODO: validate externalReference? === userId
    const subLocal = await svc.createSubscription(db, {
      userId,
      gatewaySubscriptionId: subMp.id,
      gatewayCustomerId: subMp.payerId,
      status: "pending",
      plan: plan.type,
      billingCycle: plan.billingCycle,
      subscribedAt: new Date().toISOString(),
    })
    return c.json({ urlCheckout: subMp.urlCheckout, localId: subLocal.id })
  }
)

// appSub.post(
//   "/create-checkout",
//   zValidator("json", z.object({ plan: z.nativeEnum(SubscriptionPlan), billingCycle: z.nativeEnum(BillingCycle) })),
//   async (c) => {
//     const userId = c.get("session").userId
//     const email = c.get("user").email
//     const data = c.req.valid("json")
//     const db = c.get("db")
//     const checkout = await svc.createCheckout(c.env, db, userId, email, data)
//     return c.json(checkout)
//   }
// )

appSub.post("/cancel", zValidator("json", CancelSubscriptionSchema), requireActiveSubscription, async (c) => {
  const userId = c.get("session").userId
  const db = c.get("db")
  const data = c.req.valid("json")

  const currentSub = await svc.getCurrentSubscription(db, userId)
  const mpCanceled = await mpService.cancelSubscription(c.get("mercadopago"), currentSub.gatewaySubscriptionId, userId)
  if (!mpCanceled) throw new Error("Sucedio un error al cancelar la suscripción. Intentalo de nuevo más tarde.")

  const canceled = await svc.cancelSubscription(db, userId, currentSub.id, data)
  return c.json(canceled)
})

// if suscriution was cancelled, but yet in valid period, then we can reactivate it.
appSub.post("/reactivate", requireCanceledSubscription, async (c) => {
  const userId = c.get("session").userId
  const db = c.get("db")
  const reactivated = await svc.reactivateSubscription(db, userId)
  return c.json(reactivated)
})

appSub.get("/history", async (c) => {
  const userId = c.get("session").userId
  const db = c.get("db")
  const history = await svc.getSubscriptionHistory(db, userId)
  return c.json(history)
})

export default appSub
