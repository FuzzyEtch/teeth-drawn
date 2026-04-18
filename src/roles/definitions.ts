import type { RoleDefinition } from './types'

/** Canonical role list. Each `id` must stay stable for saved counts to match. */
export const ROLES: readonly RoleDefinition[] = [
  {
    id: 'werewolf',
    name: 'Werewolf',
    category: 'vanilla',
    description:
      'A member of the wolf team. At night, werewolves agree on one player to eliminate. During the day they blend in with the village and try not to be voted out.',
  },
  {
    id: 'villager',
    name: 'Villager',
    category: 'vanilla',
    description:
      'A regular townsperson with no night action. Use discussion and votes during the day to find and eliminate the werewolves.',
  },
  {
    id: 'tanner',
    name: 'Tanner',
    category: 'neutral',
    description:
      'A neutral who wins only if eliminated by the village during the day (rules vary by table—confirm with your moderator).',
  },
  {
    id: 'fool',
    name: 'Fool',
    category: 'neutral',
    description:
      'A neutral role whose win condition depends on your house rules—often a trickster or alternate objective separate from town and wolves.',
  },
] as const
