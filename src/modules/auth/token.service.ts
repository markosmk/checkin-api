import { and, eq } from "drizzle-orm"
import { TypeUseToken, usersTokens } from "../../db/schema"
import { DB } from "../../types"
import { hashToken, isWithinExpirationDate } from "./session.service"

// helpers
export const generateCodeInDB = async (
  db: DB,
  userId: string,
  email: string,
  type: TypeUseToken,
  expireTime: number
): Promise<string> => {
  // Delete only tokens of the same type for this user
  await db.delete(usersTokens).where(and(eq(usersTokens.userId, userId), eq(usersTokens.typeUse, type)))
  const code = crypto.randomUUID()
  const hashedCode = await hashToken(code)
  await db.insert(usersTokens).values({
    userId,
    email,
    code: hashedCode, // saved hashed code
    typeUse: type,
    expiresAt: new Date(Date.now() + expireTime),
  })
  return code
}

export const verifyCode = async (
  db: DB,
  opts: { email?: string; code: string; typeUse: TypeUseToken }
): Promise<{ userId: string | null; isValid: boolean }> => {
  // return await db.transaction(async (tx) => {
  const hashedCode = await hashToken(opts.code)
  const databaseCode = await db.query.usersTokens.findFirst({
    where: and(eq(usersTokens.code, hashedCode), eq(usersTokens.typeUse, opts.typeUse)), //and(eq(usersTokens.email, email),
  })
  if (!databaseCode) {
    // tx.rollback() // sent to throw to rollback the transaction
    return { userId: null, isValid: false }
  }

  if (opts.email && databaseCode.email !== opts.email) {
    // tx.rollback() // sent to throw to rollback the transaction
    return { userId: null, isValid: false }
  }

  await db.delete(usersTokens).where(eq(usersTokens.id, databaseCode.id))

  if (!isWithinExpirationDate(databaseCode.expiresAt)) {
    return { userId: null, isValid: false }
  }

  return { userId: databaseCode.userId, isValid: true }
  // })
}
