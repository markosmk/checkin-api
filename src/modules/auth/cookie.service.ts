import { NAME_COOKIE_SESSION, TIME_EXPIRE_SESSION } from "../../config/constants"

interface CookieAttributes {
  secure?: boolean
  path?: string
  domain?: string
  sameSite?: "lax" | "strict" | "none"
  httpOnly?: boolean
  maxAge?: number
  expires?: Date
}

function createCookie(nameCookie: string, value = "", opts?: CookieAttributes): string {
  const basic: CookieAttributes = { sameSite: "lax", httpOnly: true, path: "/", ...opts }
  let cookieString = `${nameCookie}=${value}`
  if (basic.path) cookieString += `; Path=${basic.path}`
  if (basic.domain) cookieString += `; Domain=${basic.domain}`
  if (basic.sameSite) cookieString += `; SameSite=${basic.sameSite.charAt(0).toUpperCase() + basic.sameSite.slice(1)}`
  if (basic.httpOnly) cookieString += "; HttpOnly"
  if (basic.secure === true) cookieString += "; Secure"
  if (basic.maxAge) cookieString += `; Max-Age=${basic.maxAge}`
  if (basic.expires) cookieString += `; Expires=${basic.expires.toUTCString()}`
  return cookieString
}

/** https://lucia-auth.com/sessions/cookies/ */
export function createSessionCookie(token: string, opts?: CookieAttributes): string {
  return createCookie(NAME_COOKIE_SESSION, token, {
    expires: new Date(Date.now() + TIME_EXPIRE_SESSION),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    ...opts,
  })
}

export function createBlankSessionCookie(opts: { secure: boolean }): string {
  return createCookie(NAME_COOKIE_SESSION, "", {
    maxAge: 0,
    secure: opts.secure,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  })
}
