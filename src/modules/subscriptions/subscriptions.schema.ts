import { z } from "zod"
import { BillingCycle, SubscriptionPlan } from "../../db/enum"

export const ChangePlanSchema = z.object({
  plan: z.nativeEnum(SubscriptionPlan),
  billingCycle: z.nativeEnum(BillingCycle).optional(),
})

export const CancelSubscriptionSchema = z.object({
  reason: z.string().optional(),
})

export type ChangePlanInput = z.infer<typeof ChangePlanSchema>
export type CancelSubscriptionInput = z.infer<typeof CancelSubscriptionSchema>
