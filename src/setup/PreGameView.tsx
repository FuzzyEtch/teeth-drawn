import { useCallback, useState } from 'react'
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

  const dismissStartError = useCallback(() => {
    setStartError(null)
  }, [])

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
    onGameStart()
  }, [onGameStart])

  return (
    <div className="home">
      <h1>Werewolf Tabletop</h1>

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
