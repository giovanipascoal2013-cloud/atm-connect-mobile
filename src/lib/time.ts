export function timeSince(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime()
  if (Number.isNaN(diff) || diff < 60_000) return 'agora mesmo'
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `há ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return `há ${days}d`
}

export function timeUntil(date: string | Date): string {
  const diff = new Date(date).getTime() - Date.now()
  if (Number.isNaN(diff) || diff <= 0) return 'a expirar'
  const minutes = Math.ceil(diff / 60_000)
  if (minutes < 60) return `em ${minutes}min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours < 24) return `em ${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}min` : ''}`
  const days = Math.floor(hours / 24)
  return `em ${days}d`
}
