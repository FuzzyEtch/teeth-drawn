/** Extend this union when adding new role categories. */
export type RoleCategory = 'vanilla' | 'neutral'

export type RoleDefinition = {
  id: string
  name: string
  category: RoleCategory
  description: string
}

export type RoleCounts = Record<string, number>
