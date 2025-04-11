import { z } from "zod"
// import { createSelectSchema } from "drizzle-zod"
// import { users } from "../../db/schema"

// const selectUser = createSelectSchema(users)
// export const selectUserSchema = selectUser.omit({
//   password: true,
//   subscriptionId: true,
//   emailVerified: true,
//   createdAt: true,
//   updatedAt: true,
// })

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  selectedPlan: z.string().default("free"), //SubscriptionPlan.default("free"),
})
export type RegisterSchemaInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})
export type LoginSchemaInput = z.infer<typeof loginSchema>

export const emailSchema = z.object({
  email: z.string().email(),
})

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6),
  email: z.string().email(),
})
export type ResetPasswordSchemaInput = z.infer<typeof resetPasswordSchema>
