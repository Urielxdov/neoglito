export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatRelativeTime(date: Date): string {
  const minutes = Math.round((Date.now() - date.getTime()) / 60000)

  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `hace ${hours} h`

  const days = Math.round(hours / 24)
  return days === 1 ? 'hace 1 día' : `hace ${days} días`
}
