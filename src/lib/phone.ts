export function cleanPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '').replace(/^\+?244/, '')
}

export function formatPhone(value: string): string {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length <= 3) return cleaned
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)}`
}

export function isValidPhone(phone: string): boolean {
  return /^9\d{8}$/.test(cleanPhone(phone))
}

export function phoneToEmail(phone: string): string {
  return `${cleanPhone(phone)}@dinheiroemao.ao`
}

export function waLink(phone: string, text?: string): string {
  const cleaned = cleanPhone(phone)
  const url = `https://wa.me/244${cleaned}`
  return text ? `${url}?text=${encodeURIComponent(text)}` : url
}
