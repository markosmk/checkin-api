import type { JwtPayload } from "hono/jwt"

export interface CustomJwtPayload extends JwtPayload {
  userId: string
  email: string
}

export type Variables = {
  jwtPayload: CustomJwtPayload
}
