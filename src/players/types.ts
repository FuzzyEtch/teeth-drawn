/** `id` is for stable list identity (reorder, React keys); only `name` is shown in UI. */
export type Player = { name: string; id: string }

/** Lobby players plus assigned role id (set when a game is in progress). */
export type PlayerWithRole = Player & {
  roleId: string
  /** Confirmed eliminations (day hang or end of night). */
  dead: boolean
  /**
   * Serial killer chose this player this night; they are not `dead` until dawn.
   * They still take their night turn if it comes before morning.
   */
  pendingKillAtDawn?: boolean
}
