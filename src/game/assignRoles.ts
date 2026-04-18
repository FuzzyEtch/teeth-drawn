import type { Player, PlayerWithRole } from '../players/types'
import { ROLES } from '../roles/definitions'
import type { RoleCounts } from '../roles/types'

function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = items[i]
    items[i] = items[j]!
    items[j] = t!
  }
}

/**
 * Builds a random assignment of roles to players. Caller must ensure
 * `players.length === sum(counts)` (e.g. via sumRoleCounts).
 */
export function assignRolesToPlayers(players: Player[], counts: RoleCounts): PlayerWithRole[] {
  const pool: string[] = []
  for (const role of ROLES) {
    const n = counts[role.id] ?? 0
    for (let i = 0; i < n; i++) {
      pool.push(role.id)
    }
  }
  shuffleInPlace(pool)
  return players.map((p, i) => ({ ...p, roleId: pool[i]!, dead: false }))
}
