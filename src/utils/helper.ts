export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD") // separate accents from letters
    .replace(
      /\u0300|\u0301|\u0302|\u0303|\u0304|\u0305|\u0306|\u0307|\u0308|\u0309|\u030a|\u030b|\u030c|\u030d|\u030e|\u030f|\u0310|\u0311|\u0312|\u0313|\u0314|\u0315|\u0316|\u0317|\u0318|\u0319|\u031a|\u031b|\u031c|\u031d|\u031e|\u031f|\u0320|\u0321|\u0322|\u0323|\u0324|\u0325|\u0326|\u0327|\u0328|\u0329|\u032a|\u032b|\u032c|\u032d|\u032e|\u032f|\u0330|\u0331|\u0332|\u0333|\u0334|\u0335|\u0336|\u0337|\u0338|\u0339|\u033a|\u033b|\u033c|\u033d|\u033e|\u033f|\u0340|\u0341|\u0342|\u0343|\u0344|\u0345|\u0346|\u0347|\u0348|\u0349|\u034a|\u034b|\u034c|\u034d|\u034e|\u034f|\u0350|\u0351|\u0352|\u0353|\u0354|\u0355|\u0356|\u0357|\u0358|\u0359|\u035a|\u035b|\u035c|\u035d|\u035e|\u035f|\u0360|\u0361|\u0362|\u0363|\u0364|\u0365|\u0366|\u0367|\u0368|\u0369|\u036a|\u036b|\u036c|\u036d|\u036e|\u036f/g,
      ""
    ) // delete all accents
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
}

export function generateCode(email: string, maxLength = 20): string {
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
  let os = "Desconocido"
  let osVersion = "Desconocido"
  let device = "PC"
  let manufacturer = "Desconocido"
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
