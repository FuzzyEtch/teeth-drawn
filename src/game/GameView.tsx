import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadPlayers } from '../players/storage'
import type { PlayerWithRole } from '../players/types'
import { ROLES } from '../roles/definitions'
import { categoryLabel } from '../roles/groupByCategory'
import {
  DayAnnouncementsPanel,
  DayDiscussionPanel,
  DayVoteCastingPanel,
  DayVoteTallyPanel,
  DISCUSSION_DEFAULT_MS,
} from './day/DayPhasePanels'
import { createEliminationNightEvent } from './nightEvents'
import type { NightEvent } from './nightEvents'
import { NightActionForRole } from './nightActions/registry'
import { buildNightPendingQueue, rosterFromAssignments } from './roster'
import {
  loadGameState,
  saveDayProgress,
  saveNightDraft,
  type DayStep,
  type NightDraft,
  type RoleAssignment,
} from './storage'
import {
  canPlayerVote,
  canReceiveDayVotes,
  dayVoteTargets,
  eligibleVoters,
  type VoteRecord,
} from './voting'
import './GameView.css'

const IDENTITY_DELAY_MS = 2000

function getRoleDefinition(roleId: string) {
  return ROLES.find((r) => r.id === roleId)
}

function hydrateGameView(): {
  cycle: 'night' | 'day'
  round: number
  pendingPlayerIds: string[]
  nightStep: NightDraft['nightStep']
  identityStep: NightDraft['identityStep']
  roleAssignments: RoleAssignment[]
  deadPlayerIds: string[]
  pendingNightKillIds: string[]
  nightEventsLog: NightEvent[]
  dayStep: DayStep
  discussionEndAt: number | null
  voteRecords: VoteRecord[]
  voteCastingIndex: number
} {
  const s = loadGameState()
  const emptyEvents: NightEvent[] = []
  const emptyVotes: VoteRecord[] = []
  if (s.phase === 'night_draft') {
    const { draft } = s
    return {
      cycle: 'night',
      round: draft.round,
      pendingPlayerIds: draft.pendingPlayerIds,
      nightStep: draft.nightStep,
      identityStep: draft.identityStep,
      roleAssignments: s.roleAssignments,
      deadPlayerIds: s.deadPlayerIds,
      pendingNightKillIds: s.draft.pendingNightKillIds ?? [],
      nightEventsLog: s.nightEventsLog ?? emptyEvents,
      dayStep: 'announcements',
      discussionEndAt: null,
      voteRecords: emptyVotes,
      voteCastingIndex: 0,
    }
  }
  if (s.phase === 'day') {
    return {
      cycle: 'day',
      round: s.round,
      pendingPlayerIds: [],
      nightStep: 'identity',
      identityStep: 'delay',
      roleAssignments: s.roleAssignments,
      deadPlayerIds: s.deadPlayerIds,
      pendingNightKillIds: [],
      nightEventsLog: s.nightEventsLog ?? emptyEvents,
      dayStep: s.dayStep ?? 'announcements',
      discussionEndAt: s.discussionEndAt ?? null,
      voteRecords: s.voteRecords ?? emptyVotes,
      voteCastingIndex: s.voteCastingIndex ?? 0,
    }
  }
  return {
    cycle: 'night',
    round: 1,
    pendingPlayerIds: [],
    nightStep: 'identity',
    identityStep: 'delay',
    roleAssignments: [],
    deadPlayerIds: [],
    pendingNightKillIds: [],
    nightEventsLog: [],
    dayStep: 'announcements',
    discussionEndAt: null,
    voteRecords: emptyVotes,
    voteCastingIndex: 0,
  }
}

function serialKillerKillCandidates(roster: PlayerWithRole[], current: PlayerWithRole): PlayerWithRole[] {
  return roster.filter(
    (p) => !p.dead && !p.pendingKillAtDawn && p.id !== current.id,
  )
}

function canFinishNightAction(
  roleId: string,
  roster: PlayerWithRole[],
  current: PlayerWithRole,
  killTargetId: string | null,
): boolean {
  if (roleId === 'serial_killer') {
    const candidates = serialKillerKillCandidates(roster, current)
    if (candidates.length === 0) return true
    return killTargetId !== null
  }
  return true
}

export function GameView() {
  const lobby = useMemo(() => loadPlayers(), [])
  const initial = useMemo(() => hydrateGameView(), [])

  const [roleAssignments] = useState<RoleAssignment[]>(() => initial.roleAssignments)

  const [deadPlayerIds, setDeadPlayerIds] = useState<string[]>(() => initial.deadPlayerIds)
  const [pendingNightKillIds, setPendingNightKillIds] = useState<string[]>(
    () => initial.pendingNightKillIds,
  )
  const [nightEventsLog, setNightEventsLog] = useState<NightEvent[]>(() => initial.nightEventsLog)

  const [cycle, setCycle] = useState<'night' | 'day'>(initial.cycle)
  const [round, setRound] = useState(initial.round)
  const [pendingPlayerIds, setPendingPlayerIds] = useState<string[]>(() => initial.pendingPlayerIds)
  const [nightStep, setNightStep] = useState<'identity' | 'actions'>(initial.nightStep)
  const [identityStep, setIdentityStep] = useState<'delay' | 'first' | 'yes'>(initial.identityStep)

  const [dayStep, setDayStep] = useState<DayStep>(() => initial.dayStep)
  const [discussionEndAt, setDiscussionEndAt] = useState<number | null>(() => initial.discussionEndAt)

  const [voteRecords, setVoteRecords] = useState<VoteRecord[]>(() => initial.voteRecords)
  const [voteCastingIndex, setVoteCastingIndex] = useState(() => initial.voteCastingIndex)
  const [voteTargetId, setVoteTargetId] = useState<string | null>(null)

  const [killTargetId, setKillTargetId] = useState<string | null>(null)
  const [discussionTimerTick, setDiscussionTimerTick] = useState(0)

  const roster = useMemo(
    () =>
      rosterFromAssignments(
        lobby,
        roleAssignments,
        deadPlayerIds,
        cycle === 'night' ? pendingNightKillIds : [],
      ),
    [lobby, roleAssignments, deadPlayerIds, cycle, pendingNightKillIds],
  )

  const nightTurnPlayerId = pendingPlayerIds[0]
  const currentPlayer: PlayerWithRole | undefined =
    cycle === 'night' && nightTurnPlayerId
      ? roster?.find((p) => p.id === nightTurnPlayerId)
      : undefined

  useEffect(() => {
    setKillTargetId(null)
  }, [nightTurnPlayerId])

  useEffect(() => {
    if (cycle === 'night') {
      saveNightDraft(
        {
          round,
          pendingPlayerIds,
          pendingNightKillIds,
          nightStep,
          identityStep,
        },
        roleAssignments,
        deadPlayerIds,
        nightEventsLog,
      )
    } else {
      saveDayProgress(
        round,
        roleAssignments,
        deadPlayerIds,
        nightEventsLog,
        dayStep,
        discussionEndAt,
        voteRecords,
        voteCastingIndex,
      )
    }
  }, [
    cycle,
    round,
    pendingPlayerIds,
    pendingNightKillIds,
    nightStep,
    identityStep,
    roleAssignments,
    deadPlayerIds,
    nightEventsLog,
    dayStep,
    discussionEndAt,
    voteRecords,
    voteCastingIndex,
  ])

  useEffect(() => {
    if (cycle !== 'night' || nightStep !== 'identity' || identityStep !== 'delay') {
      return
    }
    const t = window.setTimeout(() => {
      setIdentityStep('first')
    }, IDENTITY_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [cycle, nightStep, identityStep, nightTurnPlayerId, round])

  useEffect(() => {
    if (cycle !== 'day' || dayStep !== 'discussion' || discussionEndAt === null) {
      return
    }
    const id = window.setInterval(() => {
      setDiscussionTimerTick((x) => x + 1)
    }, 250)
    return () => window.clearInterval(id)
  }, [cycle, dayStep, discussionEndAt])

  useEffect(() => {
    if (cycle !== 'day' || dayStep !== 'discussion' || discussionEndAt === null) return
    if (Date.now() >= discussionEndAt) {
      setDayStep('voting')
      setDiscussionEndAt(null)
      setVoteRecords([])
      setVoteCastingIndex(0)
      setVoteTargetId(null)
    }
  }, [cycle, dayStep, discussionEndAt, discussionTimerTick])

  useEffect(() => {
    setVoteTargetId(null)
  }, [voteCastingIndex])

  const onFirstIdentityConfirm = useCallback(() => {
    setIdentityStep('yes')
  }, [])

  const onYesIdentityConfirm = useCallback(() => {
    setNightStep('actions')
  }, [])

  const onNightActionsContinue = useCallback(() => {
    if (!roster || !currentPlayer) return
    if (!canFinishNightAction(currentPlayer.roleId, roster, currentPlayer, killTargetId)) return

    let nextPendingKills = pendingNightKillIds
    if (currentPlayer.roleId === 'serial_killer' && killTargetId) {
      const victim = roster.find((p) => p.id === killTargetId)
      nextPendingKills = [...new Set([...pendingNightKillIds, killTargetId])]
      setNightEventsLog((prev) => [
        ...prev,
        createEliminationNightEvent(killTargetId, victim?.name ?? 'Someone', { publicNextDay: true }),
      ])
    }

    const nextQueue = pendingPlayerIds.slice(1)

    setKillTargetId(null)
    setNightStep('identity')
    setIdentityStep('delay')
    setPendingPlayerIds(nextQueue)

    if (nextQueue.length === 0) {
      setDeadPlayerIds((prev) => [...new Set([...prev, ...nextPendingKills])])
      setPendingNightKillIds([])
      setCycle('day')
      setDayStep('announcements')
      setDiscussionEndAt(null)
    } else {
      setPendingNightKillIds(nextPendingKills)
    }
  }, [roster, currentPlayer, killTargetId, pendingNightKillIds, pendingPlayerIds])

  const onAnnouncementsContinue = useCallback(() => {
    setDayStep('discussion')
    setDiscussionEndAt(Date.now() + DISCUSSION_DEFAULT_MS)
    setDiscussionTimerTick(0)
  }, [])

  const onAddDiscussionMinute = useCallback(() => {
    setDiscussionEndAt((prev) => {
      const base = prev ?? Date.now()
      return base + 60_000
    })
  }, [])

  const onEndDiscussion = useCallback(() => {
    setDayStep('voting')
    setDiscussionEndAt(null)
    setVoteRecords([])
    setVoteCastingIndex(0)
    setVoteTargetId(null)
  }, [])

  const onContinueToNextNight = useCallback(() => {
    setNightEventsLog([])
    setVoteRecords([])
    setVoteCastingIndex(0)
    setVoteTargetId(null)
    setCycle('night')
    setRound((r) => r + 1)
    setNightStep('identity')
    setIdentityStep('delay')
    setKillTargetId(null)
    setDayStep('announcements')
    setDiscussionEndAt(null)
    setPendingNightKillIds([])
    setPendingPlayerIds(buildNightPendingQueue(roleAssignments, deadPlayerIds))
  }, [roleAssignments, deadPlayerIds])

  const onSubmitDayVote = useCallback(() => {
    if (!roster || voteTargetId === null) return
    const voters = eligibleVoters(roster)
    const currentVoter = voters[voteCastingIndex]
    if (!currentVoter) return
    const target = roster.find((p) => p.id === voteTargetId)
    if (!target || !canPlayerVote(currentVoter) || !canReceiveDayVotes(target)) return
    setVoteRecords((prev) => [...prev, { voterId: currentVoter.id, targetId: target.id }])
    setVoteCastingIndex((i) => i + 1)
    setVoteTargetId(null)
  }, [roster, voteTargetId, voteCastingIndex])

  if (lobby.length === 0) {
    return (
      <div className="home game-view">
        <h1>Teeth Drawn</h1>
        <p className="game-view-placeholder">No players loaded. Add players before starting a game.</p>
      </div>
    )
  }

  if (!roleAssignments.length || !roster) {
    return (
      <div className="home game-view">
        <h1>Teeth Drawn</h1>
        <p className="game-view-placeholder">
          This saved game does not have role data, or the player list no longer matches. Discard the
          saved game from the setup screen and start again.
        </p>
      </div>
    )
  }

  const nightActionAllowed =
    currentPlayer &&
    canFinishNightAction(currentPlayer.roleId, roster, currentPlayer, killTargetId)

  const dayEligibleVoters = useMemo(() => eligibleVoters(roster), [roster])
  const dayVoteTargetList = useMemo(() => dayVoteTargets(roster), [roster])
  const currentDayVoter = dayEligibleVoters[voteCastingIndex]
  const showVoteCasting =
    dayStep === 'voting' && voteCastingIndex < dayEligibleVoters.length && currentDayVoter
  const showVoteTally = dayStep === 'voting' && voteCastingIndex >= dayEligibleVoters.length

  return (
    <div className="home game-view">
      <h1>Teeth Drawn</h1>

      {cycle === 'night' && (
        <section className="game-view-segment" aria-label="Night phase">
          <p className="game-view-phase-label">Night {round}</p>

          {nightStep === 'identity' && currentPlayer && (
            <div className="game-view-panel">
              <h2 className="game-view-subheading">Pass the device</h2>
              <p className="game-view-placeholder">
                Only the player named below should look at the screen. Confirm that you are that
                player.
              </p>
              <p className="game-view-player-name">{currentPlayer.name}</p>

              {(identityStep === 'delay' || identityStep === 'first') && (
                <>
                  <button
                    type="button"
                    className="game-view-btn"
                    disabled={identityStep === 'delay'}
                    onClick={onFirstIdentityConfirm}
                  >
                    I am {currentPlayer.name}
                  </button>
                  <p className="game-view-hint">
                    {identityStep === 'delay'
                      ? 'You can confirm in a moment…'
                      : 'Tap once to continue to final confirmation.'}
                  </p>
                </>
              )}

              {identityStep === 'yes' && (
                <>
                  <p className="game-view-placeholder game-view-confirm-prompt">
                    Confirm one more time that you are <strong>{currentPlayer.name}</strong>.
                  </p>
                  <button type="button" className="game-view-btn" onClick={onYesIdentityConfirm}>
                    Yes
                  </button>
                </>
              )}
            </div>
          )}

          {nightStep === 'actions' && currentPlayer && (
            <div className="game-view-panel game-view-panel--night-actions">
              <h2 className="game-view-subheading">Night</h2>
              <p className="game-view-night-player">
                You are playing as <strong>{currentPlayer.name}</strong>.
              </p>

              {(() => {
                const roleDef = getRoleDefinition(currentPlayer.roleId)
                if (!roleDef) {
                  return (
                    <p className="game-view-placeholder">
                      Unknown role id: <code>{currentPlayer.roleId}</code>
                    </p>
                  )
                }
                return (
                  <article className="game-view-role-card" aria-labelledby="night-role-title">
                    <p className="game-view-role-eyebrow">Your role</p>
                    <h3 className="game-view-role-title" id="night-role-title">
                      {roleDef.name}
                    </h3>
                    <p className="game-view-role-category">{categoryLabel(roleDef.category)}</p>
                    <p className="game-view-role-description">{roleDef.description}</p>
                  </article>
                )
              })()}

              <div className="game-view-action-slot" aria-label="Night action">
                <p className="game-view-action-slot-label">Night action</p>
                <NightActionForRole
                  roleId={currentPlayer.roleId}
                  currentPlayer={currentPlayer}
                  roster={roster}
                  killTargetId={killTargetId}
                  onKillTargetChange={setKillTargetId}
                />
              </div>

              <button
                type="button"
                className="game-view-btn"
                disabled={!nightActionAllowed}
                onClick={onNightActionsContinue}
              >
                Continue
              </button>
            </div>
          )}
        </section>
      )}

      {cycle === 'day' && (
        <section className="game-view-segment" aria-label="Day phase">
          {dayStep === 'announcements' && (
            <DayAnnouncementsPanel
              round={round}
              nightEventsLog={nightEventsLog}
              onContinue={onAnnouncementsContinue}
            />
          )}
          {dayStep === 'discussion' && discussionEndAt !== null && (
            <DayDiscussionPanel
              discussionEndAt={discussionEndAt}
              onAddMinute={onAddDiscussionMinute}
              onEndDiscussion={onEndDiscussion}
              timerTick={discussionTimerTick}
            />
          )}
          {showVoteCasting && currentDayVoter && (
            <DayVoteCastingPanel
              round={round}
              currentVoter={currentDayVoter}
              voteTargets={dayVoteTargetList}
              castingIndex={voteCastingIndex}
              eligibleTotal={dayEligibleVoters.length}
              selectedTargetId={voteTargetId}
              onSelectTarget={setVoteTargetId}
              onSubmitVote={onSubmitDayVote}
            />
          )}
          {showVoteTally && (
            <DayVoteTallyPanel
              round={round}
              roster={roster}
              votes={voteRecords}
              onContinueToNight={onContinueToNextNight}
            />
          )}
        </section>
      )}
    </div>
  )
}
