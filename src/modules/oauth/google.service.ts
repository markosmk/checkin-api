import type { Context } from "hono"
import { eq } from "drizzle-orm"
import { GoogleUser } from "@hono/oauth-providers/google"
import { createId } from "@paralleldrive/cuid2"
import * as sessionService from "../auth/session.service"
import { oauthAccounts, Session, User, users } from "../../db/schema"

type CreateGoogleSessionProps = {
  c: Context
  userGoogle: Partial<GoogleUser>
  sessionToken?: string
}

export const createGoogleSession = async ({
  c,
  userGoogle,
  sessionToken,
}: CreateGoogleSessionProps): Promise<Session | null> => {
  const db = c.get("db")
  const { id: googleId, email, name, verified_email, picture } = userGoogle

  if (!googleId || !email) return null

  try {
    // 1. get existent user (by sesión or email)
    let existingUser: User | null = null

    // first search by current session (para vinculación)
    if (sessionToken) {
      const sessionData = await sessionService.validateSessionToken(db, sessionToken)
      existingUser = sessionData.user ?? null
      // if there is a user (por sesion), verify is email google is the same
      if (existingUser && existingUser.email !== email) {
        // Caso crítico: Usuario autenticado intenta vincular un email ajeno
        throw new Error(
          "El email de Google no coincide con tu cuenta actual. " +
            "Cierra sesión primero si deseas vincular una cuenta diferente."
        )
      }
    }

    // if not session, search by email
    if (!existingUser) {
      existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      })
    }

    // 2. validate conflicts with emaqils
    if (existingUser) {
      // associate account OAuth if not exists
      const existingAccount = await db.query.oauthAccounts.findFirst({
        where: eq(oauthAccounts.providerUserId, googleId),
      })

      if (!existingAccount) {
        await db.insert(oauthAccounts).values({
          providerUserId: googleId,
          provider: "google",
          userId: existingUser.id,
        })
      }

      // update verify email if its necesary and is not verified yet
      if (!existingUser.emailVerified && verified_email) {
        await db.update(users).set({ emailVerified: 1 }).where(eq(users.id, existingUser.id))
      }

      const newSessionId = sessionService.generateSessionToken()
      return sessionService.createSession(db, newSessionId, existingUser.id)
    }

    // 3. create new user
    const userId = createId()
    // await db.transaction(async (tx:any) => {
    await db.insert(users).values({
      id: userId,
      email,
      name: name ?? "",
      emailVerified: verified_email ? 1 : 0,
      avatar: picture ?? "",
    })

    await db.insert(oauthAccounts).values({
      providerUserId: googleId,
      provider: "google",
      userId,
    })
    // })

    const newSessionId = sessionService.generateSessionToken()
    // const session = await sessionService.createSession(db, newSessionId, userId)
    return sessionService.createSession(db, newSessionId, userId)
  } catch (error) {
    console.error("Error en createGoogleSession:", error)
    return null
  }
}
