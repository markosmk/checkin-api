export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD") // separate accents from letters
    .replace(/[\u0300-\u036f]/g, "") // delete all accents
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
}

export function generateCode(email: string, maxLength: number = 20): string {
  const username = email.split("@")[0]
  const maxUsernameLength = maxLength - 5
  const trimmedUsername = username.slice(0, maxUsernameLength)
  const randomChars = Math.random().toString(36).substring(2, 7)
  return `${trimmedUsername}${randomChars}`
}

// Note: Breaking
// - Uses host instead of hostname
// - `allowedDomains` only accepts domains instead of URLs
export function verifyRequestOrigin(origin: string, allowedDomains: string[]): boolean {
  if (allowedDomains.length === 0) {
    return false
  }
  const originHost = parseURL(origin)?.host ?? null
  if (originHost === null) {
    return false
  }
  for (const domain of allowedDomains) {
    if (originHost === domain) {
      return true
    }
  }
  return false
}

function parseURL(url: URL | string): URL | null {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

export function getDeviceInfo(userAgent: string): string {
  if (!userAgent) return "Desconocido - Desconocido"

  const ua = userAgent.toLowerCase()
  let os = "Desconocido",
    osVersion = "Desconocido"
  let device = "PC",
    manufacturer = "Desconocido"
  let browser = "Desconocido"

  // system
  const osPatterns = [
    { name: "Windows", regex: /windows nt (\d+\.\d+)/ },
    { name: "MacOS", regex: /mac os x (\d+[_\d]+)/ },
    { name: "iOS", regex: /(iphone|ipad) os (\d+[_\d]+)/ },
    { name: "Android", regex: /android (\d+\.\d+)/ },
    { name: "Linux", regex: /linux/ },
    { name: "ChromeOS", regex: /cros/ },
  ]

  for (const { name, regex } of osPatterns) {
    const match = ua.match(regex)
    if (match) {
      os = name
      osVersion = match[1] || "Desconocido"
      if (["MacOS", "iOS"].includes(name)) {
        osVersion = osVersion.replace(/_/g, ".")
      }
      break
    }
  }

  // device and manufacturer
  if (os === "iOS") {
    device = ua.includes("iphone") ? "iPhone" : "iPad"
    manufacturer = "Apple"
  } else if (os === "Android") {
    manufacturer = "Desconocido"
    if (ua.includes("xiaomi")) manufacturer = "Xiaomi"
    else if (ua.includes("samsung")) manufacturer = "Samsung"
    else if (ua.includes("huawei")) manufacturer = "Huawei"
    else if (ua.includes("sony")) manufacturer = "Sony"
    // ...

    device = ua.includes("mobile") ? "Móvil" : "Tablet"
    device = `${manufacturer} ${device}`
  }

  // navigator
  const browserPatterns = [
    { name: "Chrome", regex: /chrome\/(\d+)/ },
    { name: "Safari", regex: /version\/(\d+).*safari/ },
    { name: "Firefox", regex: /firefox\/(\d+)/ },
    { name: "Edge", regex: /edge\/(\d+)/ },
  ]

  for (const { name, regex } of browserPatterns) {
    const match = ua.match(regex)
    if (match) {
      browser = `${name} ${match[1]}`
      break
    }
  }

  return `${device} - ${os} ${osVersion} - ${browser}`
}
