import type { Player, PlayerWithRole } from '../players/types'
import type { RoleAssignment } from './storage'

function asDeadSet(deadPlayerIds: Iterable<string>): Set<string> {
  return deadPlayerIds instanceof Set ? deadPlayerIds : new Set(deadPlayerIds)
}

/** Resolves stored assignments against the current lobby list (names may change; ids must match). */
export function rosterFromAssignments(
  lobby: Player[],
  assignments: RoleAssignment[],
  deadPlayerIds: Iterable<string>,
): PlayerWithRole[] | null {
  const dead = asDeadSet(deadPlayerIds)
  const byId = new Map(lobby.map((p) => [p.id, p]))
  const out: PlayerWithRole[] = []
  for (const a of assignments) {
    const p = byId.get(a.playerId)
    if (!p) return null
    out.push({
      name: p.name,
      id: p.id,
      roleId: a.roleId,
      dead: dead.has(p.id),
    })
  }
  return out
}

/** Next roster index at or after `start` whose player is alive, or null if none. */
export function nextLivingPlayerIndex(roster: PlayerWithRole[], start: number): number | null {
  for (let i = start; i < roster.length; i++) {
    if (!roster[i].dead) return i
  }
  return null
}

/** Clamp index to a living player when possible (used after load / kills). */
export function clampToLivingPlayerIndex(roster: PlayerWithRole[], index: number): number {
  if (roster.length === 0) return 0
  const next = nextLivingPlayerIndex(roster, index)
  if (next !== null) return next
  const prev = (() => {
    for (let i = Math.min(index, roster.length - 1); i >= 0; i--) {
      if (!roster[i].dead) return i
    }
    return 0
  })()
  return prev
}
