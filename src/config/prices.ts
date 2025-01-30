import { BillingCycle, SubscriptionPlan } from "@prisma/client"

export const PRICES: Record<SubscriptionPlan, Record<"usd" | "ars", Record<BillingCycle, number>>> = {
  free: {
    usd: { monthly: 0, annual: 0 },
    ars: { monthly: 0, annual: 0 },
  },
  pro: {
    usd: { monthly: 8, annual: 80 },
    ars: { monthly: 7000, annual: 70000 },
  },
  business: {
    usd: { monthly: 22, annual: 220 },
    ars: { monthly: 30000, annual: 300000 },
  },
}
