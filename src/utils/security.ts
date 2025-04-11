import { sign, verify } from "hono/jwt"
import { JWTPayload } from "hono/utils/jwt/types"
import { TokenPayload } from "../types"

export interface CustomJWTPayload extends JWTPayload, TokenPayload {}

export async function createToken(data: TokenPayload, secret: string, expInMinutes: number = 5): Promise<string> {
  const payload = {
    ...data,
    exp: Math.floor(Date.now() / 1000) + 60 * expInMinutes,
  }
  return await sign(payload, secret)
}

export async function verifyToken(token: string, secret: string): Promise<CustomJWTPayload | null> {
  try {
    return (await verify(token, secret)) as CustomJWTPayload
  } catch (err) {
    return null
  }
}
