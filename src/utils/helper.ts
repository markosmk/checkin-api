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
