import { ROLES } from './definitions'
import type { RoleCounts } from './types'

const STORAGE_KEY = 'werewolf-tabletop-role-counts'

function isRoleCounts(raw: unknown): raw is RoleCounts {
  if (typeof raw !== 'object' || raw === null) return false
  return Object.values(raw).every((v) => typeof v === 'number' && Number.isFinite(v))
}

/** Merge stored counts with known roles; ignore unknown keys; clamp to non-negative integers. */
export function loadRoleCounts(): RoleCounts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyCounts()
    const parsed = JSON.parse(raw) as unknown
    if (!isRoleCounts(parsed)) return emptyCounts()
    const next = emptyCounts()
    for (const role of ROLES) {
      const n = parsed[role.id]
      next[role.id] =
        typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
    }
    return next
  } catch {
    return emptyCounts()
  }
}

function emptyCounts(): RoleCounts {
  const counts: RoleCounts = {}
  for (const role of ROLES) {
    counts[role.id] = 0
  }
  return counts
}

export function saveRoleCounts(counts: RoleCounts) {
  const payload: RoleCounts = {}
  for (const role of ROLES) {
    const n = counts[role.id] ?? 0
    payload[role.id] = Math.max(0, Math.floor(n))
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}
