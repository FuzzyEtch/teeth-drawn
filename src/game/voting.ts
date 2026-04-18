import type { PlayerWithRole } from '../players/types'

export type VoteRecord = {
  voterId: string
  targetId: string
}

/**
 * Whether this player may cast a vote today. Extend with silenced, tied, etc.
 */
export function canPlayerVote(player: PlayerWithRole): boolean {
  if (player.dead) return false
  return true
}

/**
 * Whether this player may receive votes today. Extend separately from voting rights
 * (e.g. untargetable roles, ghost votes only, etc.).
 */
export function canReceiveDayVotes(player: PlayerWithRole): boolean {
  if (player.dead) return false
  return true
}

export function eligibleVoters(roster: PlayerWithRole[]): PlayerWithRole[] {
  return roster.filter(canPlayerVote)
}

export function dayVoteTargets(roster: PlayerWithRole[]): PlayerWithRole[] {
  return roster.filter(canReceiveDayVotes)
}

export function tallyVotesByTarget(votes: VoteRecord[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const { targetId } of votes) {
    m.set(targetId, (m.get(targetId) ?? 0) + 1)
  }
  return m
}
