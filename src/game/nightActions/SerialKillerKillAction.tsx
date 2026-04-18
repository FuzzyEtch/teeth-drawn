import type { NightActionPanelProps } from './types'

export function SerialKillerKillAction({
  currentPlayer,
  roster,
  killTargetId,
  onKillTargetChange,
}: NightActionPanelProps) {
  const candidates = roster.filter((p) => !p.dead && p.id !== currentPlayer.id)

  if (candidates.length === 0) {
    return (
      <div className="game-view-night-action-body">
        <p className="game-view-placeholder">
          There is no one left to target. Confirm with the moderator or continue.
        </p>
      </div>
    )
  }

  return (
    <div className="game-view-night-action-body">
      <p className="game-view-night-action-prompt">Choose a player to eliminate.</p>
      <ul className="game-view-target-list" role="radiogroup" aria-label="Kill target">
        {candidates.map((p) => (
          <li key={p.id} className="game-view-target-item">
            <label className="game-view-target-label">
              <input
                type="radio"
                name="serial-killer-kill-target"
                className="game-view-target-input"
                checked={killTargetId === p.id}
                onChange={() => onKillTargetChange(p.id)}
              />
              <span className="game-view-target-name">{p.name}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
