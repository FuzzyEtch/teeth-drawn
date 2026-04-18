export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to) return items
  const next = [...items]
  const [removed] = next.splice(from, 1)
  next.splice(to, 0, removed)
  return next
}
