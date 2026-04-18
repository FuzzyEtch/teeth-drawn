import { ROLES } from './definitions'
import type { RoleCounts } from './types'

export function sumRoleCounts(counts: RoleCounts): number {
  let sum = 0
  for (const role of ROLES) {
    sum += counts[role.id] ?? 0
  }
  return sum
}
