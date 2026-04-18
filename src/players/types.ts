/** `id` is for stable list identity (reorder, React keys); only `name` is shown in UI. */
export type Player = { name: string; id: string }

/** Lobby players plus assigned role id (set when a game is in progress). */
export type PlayerWithRole = Player & {
  roleId: string
  /** Set from game state; dead players are skipped during night order. */
  dead: boolean
}
