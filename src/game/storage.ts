import { ROLES } from '../roles/definitions'

export const GAME_STATE_STORAGE_KEY = 'teeth-drawn-game'
const STORAGE_KEY = GAME_STATE_STORAGE_KEY
const VERSION = 3 as const

export type NightDraft = {
  round: number
  playerIndex: number
  nightStep: 'identity' | 'actions'
  identityStep: 'delay' | 'first' | 'yes'
}

/** Ordered like the table order at game start; index matches night turn order. */
export type RoleAssignment = { playerId: string; roleId: string }

export type PersistedGameState =
  | { version: typeof VERSION; phase: 'none' }
  | {
      version: typeof VERSION
      phase: 'night_draft'
      draft: NightDraft
      roleAssignments: RoleAssignment[]
      deadPlayerIds: string[]
    }
  | {
      version: typeof VERSION
      phase: 'day'
      round: number
      roleAssignments: RoleAssignment[]
      deadPlayerIds: string[]
    }

const defaultNightDraft = (round: number): NightDraft => ({
  round,
  playerIndex: 0,
  nightStep: 'identity',
  identityStep: 'delay',
})

const KNOWN_ROLE_IDS = new Set(ROLES.map((r) => r.id))

function isRoleAssignmentRow(raw: unknown): raw is RoleAssignment {
  if (typeof raw !== 'object' || raw === null) return false
  const o = raw as Record<string, unknown>
  return (
    typeof o.playerId === 'string' &&
    o.playerId.length > 0 &&
    typeof o.roleId === 'string' &&
    o.roleId.length > 0 &&
    KNOWN_ROLE_IDS.has(o.roleId)
  )
}

function parseRoleAssignments(raw: unknown): RoleAssignment[] | null {
  if (!Array.isArray(raw)) return null
  const rows = raw.filter(isRoleAssignmentRow)
  if (rows.length !== raw.length) return null
  return rows
}

function parseDeadPlayerIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const ids = raw.filter((x): x is string => typeof x === 'string' && x.length > 0)
  return ids
}

function parsePersisted(raw: unknown): PersistedGameState | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>

  if (o.version === 1) {
    return { version: VERSION, phase: 'none' }
  }

  if (o.version !== 2 && o.version !== 3) return null

  if (o.phase === 'none') return { version: VERSION, phase: 'none' }

  const deadPlayerIds = o.version === 3 ? parseDeadPlayerIds(o.deadPlayerIds) : []

  if (o.phase === 'day' && typeof o.round === 'number' && Number.isInteger(o.round) && o.round >= 1) {
    const roleAssignments = parseRoleAssignments(o.roleAssignments)
    if (!roleAssignments?.length) return null
    return { version: VERSION, phase: 'day', round: o.round, roleAssignments, deadPlayerIds }
  }

  if (o.phase === 'night_draft' && o.draft && typeof o.draft === 'object') {
    const d = o.draft as Record<string, unknown>
    const round = d.round
    const playerIndex = d.playerIndex
    const nightStep = d.nightStep
    const identityStep = d.identityStep
    if (
      typeof round !== 'number' ||
      !Number.isInteger(round) ||
      round < 1 ||
      typeof playerIndex !== 'number' ||
      !Number.isInteger(playerIndex) ||
      playerIndex < 0 ||
      (nightStep !== 'identity' && nightStep !== 'actions') ||
      (identityStep !== 'delay' &&
        identityStep !== 'first' &&
        identityStep !== 'yes')
    ) {
      return null
    }
    const roleAssignments = parseRoleAssignments(o.roleAssignments)
    if (!roleAssignments?.length) return null
    return {
      version: VERSION,
      phase: 'night_draft',
      draft: {
        round,
        playerIndex,
        nightStep,
        identityStep,
      },
      roleAssignments,
      deadPlayerIds,
    }
  }

  return null
}

export function loadGameState(): PersistedGameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: VERSION, phase: 'none' }
    const parsed = JSON.parse(raw) as unknown
    return parsePersisted(parsed) ?? { version: VERSION, phase: 'none' }
  } catch {
    return { version: VERSION, phase: 'none' }
  }
}

function saveGameState(state: PersistedGameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/** New game from setup: night 1, start of night, with role assignments for the session. */
export function beginNewGameFromSetup(roleAssignments: RoleAssignment[]) {
  saveGameState({
    version: VERSION,
    phase: 'night_draft',
    draft: defaultNightDraft(1),
    roleAssignments,
    deadPlayerIds: [],
  })
}

/** Persist granular night progress (uncommitted until daytime). */
export function saveNightDraft(
  draft: NightDraft,
  roleAssignments: RoleAssignment[],
  deadPlayerIds: string[],
) {
  saveGameState({ version: VERSION, phase: 'night_draft', draft, roleAssignments, deadPlayerIds })
}

/** When the table leaves night and enters day, night draft is committed away. */
export function commitNightDraftToDay(
  round: number,
  roleAssignments: RoleAssignment[],
  deadPlayerIds: string[],
) {
  saveGameState({ version: VERSION, phase: 'day', round, roleAssignments, deadPlayerIds })
}

/** Discard any saved session (pregame recovery or abandon). */
export function clearGameState() {
  saveGameState({ version: VERSION, phase: 'none' })
}

export type RecoveryInfo =
  | { kind: 'night_draft'; round: number }
  | { kind: 'day'; round: number }

export function getRecoveryInfo(): RecoveryInfo | null {
  const s = loadGameState()
  if (s.phase === 'night_draft') return { kind: 'night_draft', round: s.draft.round }
  if (s.phase === 'day') return { kind: 'day', round: s.round }
  return null
}

/** After a refresh mid-night: restart that night from the first player (still uncommitted until day). */
export function resetNightDraftToStartOfRound(round: number) {
  const s = loadGameState()
  if (s.phase !== 'night_draft') return
  saveGameState({
    version: VERSION,
    phase: 'night_draft',
    draft: defaultNightDraft(round),
    roleAssignments: s.roleAssignments,
    deadPlayerIds: s.deadPlayerIds,
  })
}
