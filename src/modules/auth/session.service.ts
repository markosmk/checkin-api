import { verify } from "hono/jwt"
import crypto from "node:crypto"
import { asc, eq } from "drizzle-orm"
import { TIME_EXPIRE_SESSION } from "../../config/constants"
import { type Session, sessions, type User, users } from "../../db/schema"
import type { CustomPayload, DB } from "../../types"

// follow https://lucia-auth.com/sessions/basic-api/
// helpers
/**
 * hashing a token
 * we'll use SHA-256 hash function to hash the token.
 * we'll use the hash as the session ID.
 * use to: read token in db, and verify it.
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export function isWithinExpirationDate(date: Date): boolean {
  return Date.now() < date.getTime()
}

export function generateSessionToken(): string {
  return crypto.randomUUID()
}

export async function createSession(db: DB, token: string, userId: string, device?: string): Promise<Session> {
  const sessionId = await hashToken(token)
  const session = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + TIME_EXPIRE_SESSION),
    deviceInfo: device ?? "",
  }

  // count active sessions
  const activeSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(asc(sessions.expiresAt))
    .limit(3)

  // delete expired sesions, to count only expired sessions
  // where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())))

  if (activeSessions.length >= 3) {
    // delete most last session, first in array
    await db.delete(sessions).where(eq(sessions.id, activeSessions[0].id))
  }

  await db.insert(sessions).values(session)
  return { ...session, fresh: true }
}

//  we'll also extend the session expiration when it's close to expiration.
export async function validateSessionToken(db: DB, token: string): Promise<SessionValidationResult> {
  try {
    const sessionId = await hashToken(token)
    const result = await db
      .select({ user: users, session: sessions })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.id, sessionId))

    if (result.length < 1) {
      return { session: null, user: null }
    }

    const { user, session: sessionDatabase } = result[0]
    if (!sessionDatabase) {
      return { session: null, user: null }
    }

    const session = { ...sessionDatabase, fresh: false }

    // if the session is expired, delete it
    if (!isWithinExpirationDate(session.expiresAt)) {
      await db.delete(sessions).where(eq(sessions.id, session.id))
      return { session: null, user: null }
    }

    // half of the expiration time, to see if extending the time of the session ..
    const activePeriodExpirationDate = new Date(session.expiresAt.getTime() - TIME_EXPIRE_SESSION / 2)
    // extend the time of the session if it's close to expiration
    if (!isWithinExpirationDate(activePeriodExpirationDate)) {
      session.fresh = true
      session.expiresAt = new Date(Date.now() + TIME_EXPIRE_SESSION)
      await db
        .update(sessions)
        .set({
          expiresAt: session.expiresAt,
        })
        .where(eq(sessions.id, session.id))
    }
    const { password, ...userWithoutPassword } = user
    return { session, user: userWithoutPassword }
  } catch (error) {
    // console.error(error)
    return { session: null, user: null }
  }
}

export async function invalidateSession(db: DB, sessionId: string): Promise<void> {
  const sessionIdHashed = await hashToken(sessionId)
  await db.delete(sessions).where(eq(sessions.id, sessionIdHashed))
}

export async function invalidateAllSessions(db: DB, userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId))
}

export async function resolveBearerToken(authorizationHeader: string, secret: string): Promise<string | null> {
  try {
    const [authScheme, token] = authorizationHeader.split(" ") as [string, string | undefined]
    if (authScheme !== "Bearer" || !token) {
      return null
    }

    const decodedToken = (await verify(token, secret)) as CustomPayload
    if (!decodedToken) {
      return null
    }
    return decodedToken.sessionToken
  } catch (error) {
    // if(error instanceof JwtTokenExpired || error instanceof JwtTokenInvalid) { }
    // console.error(error)
    return null
  }
}

export type SessionValidationResult = { session: Session; user: User } | { session: null; user: null }
