import { BillingCycle, SubscriptionPlan } from "@prisma/client"
import { PRICES } from "../config/prices"

export function getDaysUsed(subscribedAt: Date) {
  const now = new Date()
  const diff = now.getTime() - subscribedAt.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function getPlanPrice(plan: SubscriptionPlan, billingCycle: BillingCycle, currency: "usd" | "ars") {
  return PRICES[plan as SubscriptionPlan][currency as "usd" | "ars"][billingCycle as BillingCycle]
}
