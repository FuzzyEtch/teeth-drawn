import type { NightActionPanelProps } from './types'

export function VillagerNightAction(_props: NightActionPanelProps) {
  return (
    <div className="game-view-night-action-body">
      <p className="game-view-placeholder">
        Villagers have no night action. When the moderator continues the night, pass the device
        along.
      </p>
    </div>
  )
}
