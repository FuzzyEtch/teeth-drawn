import type { Player } from './types'

const STORAGE_KEY = 'werewolf-tabletop-players'

function parsePlayer(raw: unknown): Player | null {
  if (typeof raw !== 'object' || raw === null || !('name' in raw)) return null
  const name = (raw as { name: unknown }).name
  if (typeof name !== 'string') return null
  const idRaw = (raw as { id?: unknown }).id
  const id =
    typeof idRaw === 'string' && idRaw.length > 0
      ? idRaw
      : crypto.randomUUID()
  return { name, id }
}

export function loadPlayers(): Player[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const list = parsed
      .map((p) => parsePlayer(p))
      .filter((p): p is Player => p !== null)
    const seen = new Set<string>()
    return list.map((p) => {
      let id = p.id
      if (seen.has(id)) id = crypto.randomUUID()
      seen.add(id)
      return { ...p, id }
    })
  } catch {
    return []
  }
}

export function savePlayers(players: Player[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players))
}
