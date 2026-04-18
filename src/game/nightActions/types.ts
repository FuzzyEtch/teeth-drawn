import type { PlayerWithRole } from '../../players/types'

export type NightActionPanelProps = {
  currentPlayer: PlayerWithRole
  roster: PlayerWithRole[]
  /** Serial killer kill target (other roles ignore). */
  killTargetId: string | null
  onKillTargetChange: (playerId: string | null) => void
}
