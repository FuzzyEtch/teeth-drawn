import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { loadPlayers } from '../players/storage'
import type { PlayerWithRole } from '../players/types'
import { ROLES } from '../roles/definitions'
import type { RoleCategory } from '../roles/types'
import { NightActionForRole } from './nightActions/registry'
import { clampToLivingPlayerIndex, nextLivingPlayerIndex, rosterFromAssignments } from './roster'
import {
  commitNightDraftToDay,
  loadGameState,
  saveNightDraft,
  type NightDraft,
  type RoleAssignment,
} from './storage'
import './GameView.css'

const IDENTITY_DELAY_MS = 2000

function getRoleDefinition(roleId: string) {
  return ROLES.find((r) => r.id === roleId)
}

function categoryLabel(category: RoleCategory): string {
  if (category === 'vanilla') return 'Standard'
  if (category === 'neutral') return 'Neutral'
  return category
}

function hydrateGameView(): {
  cycle: 'night' | 'day'
  round: number
  playerIndex: number
  nightStep: NightDraft['nightStep']
  identityStep: NightDraft['identityStep']
  roleAssignments: RoleAssignment[]
  deadPlayerIds: string[]
} {
  const s = loadGameState()
  if (s.phase === 'night_draft') {
    const { draft } = s
    return {
      cycle: 'night',
      round: draft.round,
      playerIndex: draft.playerIndex,
      nightStep: draft.nightStep,
      identityStep: draft.identityStep,
      roleAssignments: s.roleAssignments,
      deadPlayerIds: s.deadPlayerIds,
    }
  }
  if (s.phase === 'day') {
    return {
      cycle: 'day',
      round: s.round,
      playerIndex: 0,
      nightStep: 'identity',
      identityStep: 'delay',
      roleAssignments: s.roleAssignments,
      deadPlayerIds: s.deadPlayerIds,
    }
  }
  return {
    cycle: 'night',
    round: 1,
    playerIndex: 0,
    nightStep: 'identity',
    identityStep: 'delay',
    roleAssignments: [],
    deadPlayerIds: [],
  }
}

function serialKillerKillCandidates(roster: PlayerWithRole[], current: PlayerWithRole): PlayerWithRole[] {
  return roster.filter((p) => !p.dead && p.id !== current.id)
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

  const [cycle, setCycle] = useState<'night' | 'day'>(initial.cycle)
  const [round, setRound] = useState(initial.round)
  const [playerIndex, setPlayerIndex] = useState(initial.playerIndex)
  const [nightStep, setNightStep] = useState<'identity' | 'actions'>(initial.nightStep)
  const [identityStep, setIdentityStep] = useState<'delay' | 'first' | 'yes'>(initial.identityStep)

  const [killTargetId, setKillTargetId] = useState<string | null>(null)

  const roster = useMemo(
    () => rosterFromAssignments(lobby, roleAssignments, deadPlayerIds),
    [lobby, roleAssignments, deadPlayerIds],
  )

  const clampedOnce = useRef(false)
  useLayoutEffect(() => {
    if (!roster?.length || clampedOnce.current) return
    clampedOnce.current = true
    setPlayerIndex((i) => clampToLivingPlayerIndex(roster, i))
  }, [roster])

  const currentPlayer: PlayerWithRole | undefined = roster?.[playerIndex]

  useEffect(() => {
    setKillTargetId(null)
  }, [playerIndex])

  useEffect(() => {
    if (cycle === 'night') {
      saveNightDraft(
        {
          round,
          playerIndex,
          nightStep,
          identityStep,
        },
        roleAssignments,
        deadPlayerIds,
      )
    } else {
      commitNightDraftToDay(round, roleAssignments, deadPlayerIds)
    }
  }, [cycle, round, playerIndex, nightStep, identityStep, roleAssignments, deadPlayerIds])

  useEffect(() => {
    if (cycle !== 'night' || nightStep !== 'identity' || identityStep !== 'delay') {
      return
    }
    const t = window.setTimeout(() => {
      setIdentityStep('first')
    }, IDENTITY_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [cycle, nightStep, identityStep, playerIndex, round])

  const onFirstIdentityConfirm = useCallback(() => {
    setIdentityStep('yes')
  }, [])

  const onYesIdentityConfirm = useCallback(() => {
    setNightStep('actions')
  }, [])

  const onNightActionsContinue = useCallback(() => {
    if (!roster || !currentPlayer) return
    if (!canFinishNightAction(currentPlayer.roleId, roster, currentPlayer, killTargetId)) return

    let nextDead = deadPlayerIds
    if (currentPlayer.roleId === 'serial_killer' && killTargetId) {
      nextDead = [...new Set([...deadPlayerIds, killTargetId])]
      setDeadPlayerIds(nextDead)
    }

    const rosterAfter = rosterFromAssignments(lobby, roleAssignments, nextDead)
    if (!rosterAfter) return

    setKillTargetId(null)
    setNightStep('identity')
    setIdentityStep('delay')

    const nextIdx = nextLivingPlayerIndex(rosterAfter, playerIndex + 1)
    if (nextIdx === null) {
      setCycle('day')
      return
    }
    setPlayerIndex(nextIdx)
  }, [roster, currentPlayer, killTargetId, deadPlayerIds, lobby, roleAssignments, playerIndex])

  const onDayContinue = useCallback(() => {
    setCycle('night')
    setRound((r) => r + 1)
    setNightStep('identity')
    setIdentityStep('delay')
    setKillTargetId(null)
    const nextRoster = rosterFromAssignments(lobby, roleAssignments, deadPlayerIds)
    if (nextRoster?.length) {
      const first = nextLivingPlayerIndex(nextRoster, 0)
      if (first !== null) setPlayerIndex(first)
    }
  }, [lobby, roleAssignments, deadPlayerIds])

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

  return (
    <div className="home game-view">
      <h1>Teeth Drawn</h1>

      {cycle === 'night' && (
        <section className="game-view-segment" aria-label="Night phase">
          <p className="game-view-phase-label">
            Night {round} — player {playerIndex + 1} of {roster.length}
            {deadPlayerIds.length > 0 ? ` · ${deadPlayerIds.length} eliminated` : ''}
          </p>

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
          <p className="game-view-phase-label">Day {round}</p>
          <div className="game-view-panel">
            <h2 className="game-view-subheading">Day phase</h2>
            <p className="game-view-placeholder">
              The day phase will be implemented later. When you are ready, continue to the next
              night.
            </p>
            {deadPlayerIds.length > 0 && (
              <p className="game-view-placeholder">
                Eliminated this game: {deadPlayerIds.length} player
                {deadPlayerIds.length === 1 ? '' : 's'} (names hidden here to avoid spoilers).
              </p>
            )}
            <button type="button" className="game-view-btn" onClick={onDayContinue}>
              Continue to night
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
