import type { RoleDefinition } from './types'

/** Canonical role list. Each `id` must stay stable for saved counts to match. */
export const ROLES: readonly RoleDefinition[] = [
  {
    id: 'serial_killer',
    name: 'Serial Killer',
    category: 'killer',
    description:
      'A member of the killer faction. At night, serial killers choose one player to eliminate. During the day they blend in with the group and try not to be identified.',
  },
  {
    id: 'survivor',
    name: 'Survivor',
    category: 'survivor',
    description:
      'A regular townsperson with no night action. Use discussion and votes during the day to find and eliminate the serial killers.',
  },
  {
    id: 'tanner',
    name: 'Tanner',
    category: 'other',
    description:
      'A neutral role who wins only if eliminated by the village during the day.',
  },
] as const
