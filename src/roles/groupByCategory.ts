import { ROLES } from './definitions'
import type { RoleCategory, RoleDefinition } from './types'

const LABELS: Record<RoleCategory, string> = {
  killer: 'Killer',
  survivor: 'Survivor',
  other: 'Other',
}

/** Heading for a category; add entries here when you extend `RoleCategory`. */
export function categoryLabel(category: RoleCategory): string {
  return LABELS[category]
}

/** Categories in the order they first appear in the role list. */
export function categoriesInOrder(
  roles: readonly RoleDefinition[] = ROLES,
): RoleCategory[] {
  const seen = new Set<RoleCategory>()
  const order: RoleCategory[] = []
  for (const r of roles) {
    if (!seen.has(r.category)) {
      seen.add(r.category)
      order.push(r.category)
    }
  }
  return order
}

export function groupRolesByCategory(
  roles: readonly RoleDefinition[] = ROLES,
): Map<RoleCategory, RoleDefinition[]> {
  const map = new Map<RoleCategory, RoleDefinition[]>()
  for (const role of roles) {
    const list = map.get(role.category)
    if (list) list.push(role)
    else map.set(role.category, [role])
  }
  return map
}
