import { and, desc, eq } from "drizzle-orm"
import { subscriptions } from "../../db/schema"
import { SubscriptionStatus } from "../../db/enum"
import type { CreateSubscriptionInput } from "./subscriptions.schema"
import type { DB } from "../../types"

export async function getCurrentSubscription(db: DB, userId: string) {
  const [sub] = await db.query.subscriptions.findMany({
    where: and(eq(subscriptions.userId, userId), eq(subscriptions.status, SubscriptionStatus.ACTIVE)),
    orderBy: desc(subscriptions.subscribedAt),
    limit: 1,
  })
  return sub
}

// @deprecated, in favor to /create-cheakout join to weebhook mp
// export async function changePlan(
//   db: DB,
//   userId: string,
//   plan: SubscriptionPlan,
//   billingCycle: BillingCycle = BillingCycle.MONTHLY,
//   trialPeriodMs?: number
// ) {
// await db
//   .update(subscriptions)
//   .set({ status: SubscriptionStatus.CANCELLED, canceledAt: new Date().toISOString() })
//   .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, SubscriptionStatus.ACTIVE)))
// // new susbription
// const now = new Date().toISOString()
// const trialEndsAt =
//   plan === SubscriptionPlan.PRO && trialPeriodMs ? new Date(Date.now() + trialPeriodMs).toISOString() : null
// const [newSub] = await db
//   .insert(subscriptions)
//   .values({
//     id: crypto.randomUUID(),
//     userId,
//     gatewayCustomerId: "",
//     gatewaySubscriptionId: "",
//     gatewayPriceId: "",
//     gatewayCurrentPeriodEnd: "",
//     subscribedAt: now,
//     hadTrial: trialEndsAt != null,
//     trialEndsAt,
//     canceledAt: null,
//     plan,
//     status: SubscriptionStatus.ACTIVE,
//     billingCycle,
//     nextBillingDate: null,
//   })
//   .returning()
// return newSub
// }

export async function cancelSubscription(db: DB, userId: string, subscriptionId: string, data: { reason?: string }) {
  const [updated] = await db
    .update(subscriptions)
    .set({
      status: SubscriptionStatus.CANCELLED,
      canceledAt: new Date().toISOString(),
      reasonCanceled: data.reason || "No especificado",
    })
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)))
    .returning()

  // Send Mail
  // if(updated.gatewayCurrentPeriodEnd != null && updated.gatewayCurrentPeriodEnd > new Date().toISOString()){
  //   await sendEmail({
  //     to: current.gatewayCustomerId,
  //     subject: "Has cancelado tu suscripción Pro",
  //     html: `Has cancelado tu suscripción Pro. Seguirás con Pro hasta ${updated.gatewayCurrentPeriodEnd}.`,
  //   })
  // }

  return updated
}

export async function reactivateSubscription(db: DB, userId: string) {
  // Solo si fue cancelada recientemente
  const [last] = await db.query.subscriptions.findMany({
    where: and(eq(subscriptions.userId, userId), eq(subscriptions.status, SubscriptionStatus.CANCELLED)),
    orderBy: desc(subscriptions.subscribedAt),
    limit: 1,
  })
  if (!last) throw new Error("No subscription to reactivate")

  // TODO: MP to call to generate checkout link

  const [updated] = await db
    .update(subscriptions)
    .set({ status: SubscriptionStatus.ACTIVE, canceledAt: null })
    .where(eq(subscriptions.id, last.id))
    .returning()
  return updated
}

export async function getSubscriptionHistory(db: DB, userId: string) {
  return db.query.subscriptions.findMany({
    where: eq(subscriptions.userId, userId),
    orderBy: desc(subscriptions.subscribedAt),
  })
}

export async function createSubscription(db: DB, data: CreateSubscriptionInput) {
  const [sub] = await db.insert(subscriptions).values(data).returning()
  return sub
}
