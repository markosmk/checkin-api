import { z } from "zod"
import { BillingCycle, SubscriptionPlan, SubscriptionStatus } from "../../db/enum"
import { createInsertSchema } from "drizzle-zod"
import { subscriptions } from "../../db/schema"

export const ChangePlanSchema = z.object({
  plan: z.nativeEnum(SubscriptionPlan),
  billingCycle: z.nativeEnum(BillingCycle).optional(),
})

export const CancelSubscriptionSchema = z.object({
  reason: z.string().optional(),
})

export type ChangePlanInput = z.infer<typeof ChangePlanSchema>
export type CancelSubscriptionInput = z.infer<typeof CancelSubscriptionSchema>

// export const createSubscriptionSchema = z.object({
//   userId: z.string(),
//   gatewaySubscriptionId: z.string(),
//   gatewayCustomerId: z.string(),
//   externalReference: z.string(),
//   status: z.string(),
//   plan: z.nativeEnum(SubscriptionPlan),
//   billingCycle: z.nativeEnum(BillingCycle),
//   subscribedAt: z.string(),
// })
// export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>

export const createSubscriptionSchema = createInsertSchema(subscriptions).extend({
  plan: z.nativeEnum(SubscriptionPlan),
  status: z.nativeEnum(SubscriptionStatus),
  billingCycle: z.nativeEnum(BillingCycle),
})
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>
