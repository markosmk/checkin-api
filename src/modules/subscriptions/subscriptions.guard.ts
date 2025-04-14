import type { MiddlewareHandler } from "hono"
import { and, desc, eq } from "drizzle-orm"
import { subscriptions } from "../../db/schema"
import { SubscriptionStatus } from "../../db/enum"
import type { App } from "../../types"

// Para /change y /cancel
export const requireActiveSubscription: MiddlewareHandler<App> = async (c, next) => {
  const userId = c.get("session").userId
  const db = c.get("db")
  const [sub] = await db.query.subscriptions.findMany({
    where: and(eq(subscriptions.userId, userId), eq(subscriptions.status, SubscriptionStatus.ACTIVE)),
    orderBy: desc(subscriptions.subscribedAt),
    limit: 1,
  })
  if (!sub) {
    return c.json({ error: "No tienes suscripción activa." }, 403)
  }
  c.set("subscription", sub)
  await next()
}

// Para /reactivate
export const requireCanceledSubscription: MiddlewareHandler<App> = async (c, next) => {
  const userId = c.get("session").userId
  const db = c.get("db")
  const [sub] = await db.query.subscriptions.findMany({
    where: and(eq(subscriptions.userId, userId), eq(subscriptions.status, SubscriptionStatus.CANCELLED)),
    orderBy: desc(subscriptions.subscribedAt),
    limit: 1,
  })
  if (!sub) {
    return c.json({ error: "No tienes suscripción cancelada para reactivar." }, 403)
  }
  c.set("subscription", sub)
  await next()
}
