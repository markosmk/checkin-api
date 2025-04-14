import type { BillingCycle, SubscriptionPlan } from "../db/enum"

export const PRICES: Record<
  SubscriptionPlan,
  {
    usd: Record<BillingCycle, number>
    ars: Record<BillingCycle, number>
  }
> = {
  free: {
    usd: { monthly: 0, yearly: 0 },
    ars: { monthly: 0, yearly: 0 },
  },
  pro: {
    usd: { monthly: 8, yearly: 80 },
    ars: { monthly: 7000, yearly: 70000 },
  },
  // business: {
  //   usd: { monthly: 22, yearly: 220 },
  //   ars: { monthly: 30000, yearly: 300000 },
  // },
}
