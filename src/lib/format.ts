export function formatKz(value: number): string {
  const n = Number.isFinite(value) ? value : 0
  const rounded = Math.round(n * 100) / 100
  return rounded.toLocaleString('en-US', { maximumFractionDigits: 2 })
}
