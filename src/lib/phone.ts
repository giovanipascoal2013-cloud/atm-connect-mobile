export function cleanPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '').replace(/^\+?244/, '')
}

export function waLink(phone: string, text?: string): string {
  const cleaned = cleanPhone(phone)
  const url = `https://wa.me/244${cleaned}`
  return text ? `${url}?text=${encodeURIComponent(text)}` : url
}
