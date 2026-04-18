import { useCallback, useEffect, useState } from 'react'
import { assignRolesToPlayers } from '../game/assignRoles'
import {
  beginNewGameFromSetup,
  clearGameState,
  GAME_STATE_STORAGE_KEY,
  getRecoveryInfo,
  resetNightDraftToStartOfRound,
  type RecoveryInfo,
} from '../game/storage'
import { PlayersSection } from '../players'
import { loadPlayers } from '../players/storage'
import { loadRoleCounts, RolesSection, sumRoleCounts } from '../roles'
import { TransientToast } from '../TransientToast'
import './PreGameView.css'

type PreGameViewProps = {
  onGameStart: () => void
}

export function PreGameView({ onGameStart }: PreGameViewProps) {
  const [startError, setStartError] = useState<string | null>(null)
  const [recovery, setRecovery] = useState<RecoveryInfo | null>(() => getRecoveryInfo())

  useEffect(() => {
    const syncRecovery = () => {
      setRecovery(getRecoveryInfo())
    }
    window.addEventListener('focus', syncRecovery)
    const onStorage = (e: StorageEvent) => {
      if (e.key === GAME_STATE_STORAGE_KEY) syncRecovery()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('focus', syncRecovery)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const dismissStartError = useCallback(() => {
    setStartError(null)
  }, [])

  const handleDiscardSavedGame = useCallback(() => {
    clearGameState()
    setRecovery(null)
  }, [])

  const handleResumeDay = useCallback(() => {
    setStartError(null)
    onGameStart()
  }, [onGameStart])

  const handleResumeNightFromStart = useCallback(() => {
    if (recovery?.kind !== 'night_draft') return
    setStartError(null)
    resetNightDraftToStartOfRound(recovery.round)
    onGameStart()
  }, [onGameStart, recovery])

  const handleStartGame = useCallback(() => {
    const players = loadPlayers()
    const counts = loadRoleCounts()
    const roleTotal = sumRoleCounts(counts)
    const n = players.length

    if (roleTotal !== n) {
      const p = n === 1 ? '' : 's'
      const r = roleTotal === 1 ? '' : 's'
      setStartError(
        `You have ${n} player${p} but ${roleTotal} role${r} selected. Totals must match before starting.`,
      )
      return
    }

    setStartError(null)
    const assigned = assignRolesToPlayers(players, counts)
    const roleAssignments = assigned.map((p) => ({ playerId: p.id, roleId: p.roleId }))
    beginNewGameFromSetup(roleAssignments)
    onGameStart()
  }, [onGameStart])

  return (
    <div className="home">
      <h1>Teeth Drawn</h1>

      {recovery?.kind === 'night_draft' && (
        <div className="home-recovery" role="region" aria-label="Saved night in progress">
          <p className="home-recovery-text">
            A game was in progress during <strong>Night {recovery.round}</strong>. Night progress is
            not final until the day phase — if you refreshed, you can pick up from the start of this
            night or discard the saved session.
          </p>
          <div className="home-recovery-actions">
            <button type="button" className="start-game-btn" onClick={handleResumeNightFromStart}>
              Resume from start of Night {recovery.round}
            </button>
            <button type="button" className="home-recovery-discard" onClick={handleDiscardSavedGame}>
              Discard saved game
            </button>
          </div>
        </div>
      )}

      {recovery?.kind === 'day' && (
        <div className="home-recovery" role="region" aria-label="Saved day in progress">
          <p className="home-recovery-text">
            After a refresh, you can return to the <strong>most recent day phase</strong> (Day{' '}
            {recovery.round}). Night work from before that day is already settled. Continue from here,
            or discard the saved session.
          </p>
          <div className="home-recovery-actions">
            <button type="button" className="start-game-btn" onClick={handleResumeDay}>
              Resume day phase (Day {recovery.round})
            </button>
            <button type="button" className="home-recovery-discard" onClick={handleDiscardSavedGame}>
              Discard saved game
            </button>
          </div>
        </div>
      )}

      <div className="home-actions">
        <button type="button" className="start-game-btn" onClick={handleStartGame}>
          Start game
        </button>
      </div>

      <PlayersSection />
      <RolesSection />

      {startError && (
        <TransientToast message={startError} onDismiss={dismissStartError} />
      )}
    </div>
  )
}
