import { ROLES } from '../roles/definitions'
import type { NightEvent } from './nightEvents'
import type { VoteRecord } from './voting'

export const GAME_STATE_STORAGE_KEY = 'teeth-drawn-game'
const STORAGE_KEY = GAME_STATE_STORAGE_KEY
const VERSION = 7 as const

export type NightDraft = {
  round: number
  /** Player ids still to take this night’s turn (table order). Current = [0]. */
  pendingPlayerIds: string[]
  /**
   * Marked by the serial killer this night; merged into `deadPlayerIds` when night ends.
   * Not counted as eliminated until then.
   */
  pendingNightKillIds: string[]
  nightStep: 'identity' | 'actions'
  identityStep: 'delay' | 'first' | 'yes'
}

/** Ordered like the table order at game start; index matches night turn order. */
export type RoleAssignment = { playerId: string; roleId: string }

export type DayStep = 'announcements' | 'discussion' | 'voting'

export type PersistedGameState =
  | { version: typeof VERSION; phase: 'none' }
  | {
      version: typeof VERSION
      phase: 'night_draft'
      draft: NightDraft
      roleAssignments: RoleAssignment[]
      deadPlayerIds: string[]
      nightEventsLog: NightEvent[]
    }
  | {
      version: typeof VERSION
      phase: 'day'
      round: number
      roleAssignments: RoleAssignment[]
      deadPlayerIds: string[]
      nightEventsLog: NightEvent[]
      dayStep: DayStep
      /** Wall-clock ms when discussion should end; null when not in discussion. */
      discussionEndAt: number | null
      /** Collected during `dayStep === 'voting'`; cleared when starting the next night. */
      voteRecords: VoteRecord[]
      /**
       * Index into eligible voters (roster order) for the current casting step.
       * When >= eligible voter count, show tally instead of casting.
       */
      voteCastingIndex: number
    }

function defaultNightDraft(
  round: number,
  pendingPlayerIds: string[],
  pendingNightKillIds: string[] = [],
): NightDraft {
  return {
    round,
    pendingPlayerIds,
    pendingNightKillIds,
    nightStep: 'identity',
    identityStep: 'delay',
  }
}

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
  return raw.filter((x): x is string => typeof x === 'string' && x.length > 0)
}

function parseOneNightEvent(raw: unknown): NightEvent | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  if (typeof o.id !== 'string' || !o.id) return null
  if (typeof o.kind !== 'string') return null
  if (typeof o.summary !== 'string') return null
  if (typeof o.publicNextDay !== 'boolean') return null
  const metaRaw = o.meta
  let meta: NightEvent['meta']
  if (metaRaw !== undefined) {
    if (typeof metaRaw !== 'object' || metaRaw === null) return null
    const m = metaRaw as Record<string, unknown>
    if (m.targetPlayerId !== undefined && typeof m.targetPlayerId !== 'string') return null
    meta = { targetPlayerId: m.targetPlayerId }
  }
  return { id: o.id, kind: o.kind, summary: o.summary, publicNextDay: o.publicNextDay, meta }
}

function parseNightEvents(raw: unknown): NightEvent[] {
  if (!Array.isArray(raw)) return []
  return raw.map(parseOneNightEvent).filter((e): e is NightEvent => e !== null)
}

function parseDayStep(raw: unknown): DayStep | null {
  if (raw === 'announcements' || raw === 'discussion' || raw === 'voting') return raw
  return null
}

function migrateLegacyNightPendingQueue(
  assignmentOrderIds: string[],
  playerIndex: number,
  deadPlayerIds: string[],
): string[] {
  const dead = new Set(deadPlayerIds)
  const out: string[] = []
  for (let i = playerIndex; i < assignmentOrderIds.length; i++) {
    const id = assignmentOrderIds[i]
    if (!dead.has(id)) out.push(id)
  }
  return out
}

function parseVoteRecords(raw: unknown): VoteRecord[] {
  if (!Array.isArray(raw)) return []
  const out: VoteRecord[] = []
  for (const row of raw) {
    if (typeof row !== 'object' || row === null) continue
    const r = row as Record<string, unknown>
    if (typeof r.voterId !== 'string' || typeof r.targetId !== 'string') continue
    if (!r.voterId || !r.targetId) continue
    out.push({ voterId: r.voterId, targetId: r.targetId })
  }
  return out
}

function parsePersisted(raw: unknown): PersistedGameState | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>

  if (o.version === 1) {
    return { version: VERSION, phase: 'none' }
  }

  if (
    o.version !== 2 &&
    o.version !== 3 &&
    o.version !== 4 &&
    o.version !== 5 &&
    o.version !== 6 &&
    o.version !== 7
  ) {
    return null
  }

  if (o.phase === 'none') return { version: VERSION, phase: 'none' }

  const deadPlayerIds = o.version >= 3 ? parseDeadPlayerIds(o.deadPlayerIds) : []
  const nightEventsLog =
    o.version >= 4 ? parseNightEvents(o.nightEventsLog) : []

  if (o.phase === 'day' && typeof o.round === 'number' && Number.isInteger(o.round) && o.round >= 1) {
    const roleAssignments = parseRoleAssignments(o.roleAssignments)
    if (!roleAssignments?.length) return null
    const dayStep =
      o.version >= 4 ? parseDayStep(o.dayStep) ?? 'announcements' : 'announcements'
    let discussionEndAt: number | null = null
    if (o.version >= 4 && o.discussionEndAt !== undefined && o.discussionEndAt !== null) {
      if (typeof o.discussionEndAt === 'number' && Number.isFinite(o.discussionEndAt)) {
        discussionEndAt = o.discussionEndAt
      }
    }
    const voteRecords = o.version >= 5 ? parseVoteRecords(o.voteRecords) : []
    const voteCastingIndexRaw = o.voteCastingIndex
    const voteCastingIndex =
      o.version >= 5 &&
      typeof voteCastingIndexRaw === 'number' &&
      Number.isInteger(voteCastingIndexRaw) &&
      voteCastingIndexRaw >= 0
        ? voteCastingIndexRaw
        : 0
    return {
      version: VERSION,
      phase: 'day',
      round: o.round,
      roleAssignments,
      deadPlayerIds,
      nightEventsLog,
      dayStep,
      discussionEndAt,
      voteRecords,
      voteCastingIndex,
    }
  }

  if (o.phase === 'night_draft' && o.draft && typeof o.draft === 'object') {
    const d = o.draft as Record<string, unknown>
    const round = d.round
    const nightStep = d.nightStep
    const identityStep = d.identityStep
    if (
      typeof round !== 'number' ||
      !Number.isInteger(round) ||
      round < 1 ||
      (nightStep !== 'identity' && nightStep !== 'actions') ||
      (identityStep !== 'delay' &&
        identityStep !== 'first' &&
        identityStep !== 'yes')
    ) {
      return null
    }
    const roleAssignments = parseRoleAssignments(o.roleAssignments)
    if (!roleAssignments?.length) return null

    let pendingPlayerIds: string[]
    if (o.version >= 6 && Array.isArray(d.pendingPlayerIds)) {
      pendingPlayerIds = (d.pendingPlayerIds as unknown[]).filter(
        (x): x is string => typeof x === 'string' && x.length > 0,
      )
    } else {
      const legacyIdx = d.playerIndex
      const idx =
        typeof legacyIdx === 'number' && Number.isInteger(legacyIdx) && legacyIdx >= 0 ? legacyIdx : 0
      pendingPlayerIds = migrateLegacyNightPendingQueue(
        roleAssignments.map((a) => a.playerId),
        idx,
        deadPlayerIds,
      )
    }

    let pendingNightKillIds: string[] = []
    if (Array.isArray(d.pendingNightKillIds)) {
      pendingNightKillIds = (d.pendingNightKillIds as unknown[]).filter(
        (x): x is string => typeof x === 'string' && x.length > 0,
      )
    }

    return {
      version: VERSION,
      phase: 'night_draft',
      draft: {
        round,
        pendingPlayerIds,
        pendingNightKillIds,
        nightStep,
        identityStep,
      },
      roleAssignments,
      deadPlayerIds,
      nightEventsLog,
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
    draft: defaultNightDraft(1, roleAssignments.map((a) => a.playerId), []),
    roleAssignments,
    deadPlayerIds: [],
    nightEventsLog: [],
  })
}

/** Persist granular night progress (uncommitted until daytime). */
export function saveNightDraft(
  draft: NightDraft,
  roleAssignments: RoleAssignment[],
  deadPlayerIds: string[],
  nightEventsLog: NightEvent[],
) {
  saveGameState({
    version: VERSION,
    phase: 'night_draft',
    draft,
    roleAssignments,
    deadPlayerIds,
    nightEventsLog,
  })
}

/** When the table leaves night and enters day, night draft is committed away. */
export function commitNightDraftToDay(
  round: number,
  roleAssignments: RoleAssignment[],
  deadPlayerIds: string[],
  nightEventsLog: NightEvent[],
) {
  saveGameState({
    version: VERSION,
    phase: 'day',
    round,
    roleAssignments,
    deadPlayerIds,
    nightEventsLog,
    dayStep: 'announcements',
    discussionEndAt: null,
    voteRecords: [],
    voteCastingIndex: 0,
  })
}

export function saveDayProgress(
  round: number,
  roleAssignments: RoleAssignment[],
  deadPlayerIds: string[],
  nightEventsLog: NightEvent[],
  dayStep: DayStep,
  discussionEndAt: number | null,
  voteRecords: VoteRecord[],
  voteCastingIndex: number,
) {
  saveGameState({
    version: VERSION,
    phase: 'day',
    round,
    roleAssignments,
    deadPlayerIds,
    nightEventsLog,
    dayStep,
    discussionEndAt,
    voteRecords,
    voteCastingIndex,
  })
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
  const dead = new Set(s.deadPlayerIds)
  const pending = s.roleAssignments.map((a) => a.playerId).filter((id) => !dead.has(id))
  const pendingKills = s.draft.pendingNightKillIds ?? []
  saveGameState({
    version: VERSION,
    phase: 'night_draft',
    draft: defaultNightDraft(round, pending, pendingKills),
    roleAssignments: s.roleAssignments,
    deadPlayerIds: s.deadPlayerIds,
    nightEventsLog: [],
  })
}
