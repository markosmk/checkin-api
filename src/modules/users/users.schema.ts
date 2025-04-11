import { z } from "@hono/zod-openapi"
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod"
import { users } from "../../db/schema"

const SelectUserSchema = createSelectSchema(users)
export type UserData = Omit<z.infer<typeof SelectUserSchema>, "password">

export const CreateUserSchema = createInsertSchema(users).extend({
  password: z.string().min(6),
})
export type CreateUser = Pick<z.infer<typeof CreateUserSchema>, "email" | "name" | "password">

export const UpdateUserSchema = createUpdateSchema(users)
export type UpdateUser = z.infer<typeof UpdateUserSchema>
