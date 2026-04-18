import type { PlayerWithRole } from '../../players/types'
import type { NightEvent } from '../nightEvents'
import { publicNightAnnouncements } from '../nightEvents'
import type { VoteRecord } from '../voting'
import { tallyVotesByTarget } from '../voting'

const DISCUSSION_DEFAULT_MS = 2 * 60 * 1000

export { DISCUSSION_DEFAULT_MS }

function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

function nameById(roster: PlayerWithRole[], id: string): string {
  return roster.find((p) => p.id === id)?.name ?? id
}

type AnnouncementsProps = {
  round: number
  nightEventsLog: NightEvent[]
  onContinue: () => void
}

export function DayAnnouncementsPanel({ round, nightEventsLog, onContinue }: AnnouncementsProps) {
  const publicItems = publicNightAnnouncements(nightEventsLog)

  return (
    <div className="game-view-panel game-view-panel--day">
      <h2 className="game-view-subheading">Day {round}</h2>
      <p className="game-view-placeholder">Summary of last night's events:</p>
      {publicItems.length === 0 ? (
        <p className="game-view-day-empty">No public announcements from last night.</p>
      ) : (
        <ul className="game-view-day-events">
          {publicItems.map((e) => (
            <li key={e.id} className="game-view-day-event">
              {e.summary}
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="game-view-btn" onClick={onContinue}>
        Continue
      </button>
    </div>
  )
}

type DiscussionProps = {
  discussionEndAt: number
  onAddMinute: () => void
  onEndDiscussion: () => void
  /** Force re-render tick from parent */
  timerTick: number
}

export function DayDiscussionPanel({
  discussionEndAt,
  onAddMinute,
  onEndDiscussion,
  timerTick,
}: DiscussionProps) {
  const remaining = discussionEndAt - Date.now()

  return (
    <div className="game-view-panel game-view-panel--day game-view-panel--discussion">
      <h2 className="game-view-subheading">Discussion</h2>
      <p className="game-view-placeholder">
        Village discussion — decide together before voting.
      </p>
      <p
        key={timerTick}
        className="game-view-discussion-timer"
        aria-live="polite"
      >
        {formatClock(remaining)}
      </p>
      <div className="game-view-discussion-actions">
        <button type="button" className="game-view-btn game-view-btn--secondary" onClick={onAddMinute}>
          +1 minute
        </button>
        <button type="button" className="game-view-btn" onClick={onEndDiscussion}>
          End discussion
        </button>
      </div>
    </div>
  )
}

type VoteCastingProps = {
  round: number
  currentVoter: PlayerWithRole
  voteTargets: PlayerWithRole[]
  castingIndex: number
  eligibleTotal: number
  selectedTargetId: string | null
  onSelectTarget: (playerId: string) => void
  onSubmitVote: () => void
}

export function DayVoteCastingPanel({
  round,
  currentVoter,
  voteTargets,
  castingIndex,
  eligibleTotal,
  selectedTargetId,
  onSelectTarget,
  onSubmitVote,
}: VoteCastingProps) {
  const canSubmit = selectedTargetId !== null && voteTargets.some((p) => p.id === selectedTargetId)

  return (
    <div className="game-view-panel game-view-panel--day game-view-panel--voting">
      <p className="game-view-phase-label">
        Day {round} — vote {castingIndex + 1} of {eligibleTotal}
      </p>
      <h2 className="game-view-subheading">Cast your vote</h2>
      <p className="game-view-placeholder">
        Pass the device to <strong>{currentVoter.name}</strong>. Choose who receives this vote.
      </p>
      {voteTargets.length === 0 ? (
        <p className="game-view-placeholder">
          There are no valid vote targets under the current rules. Confirm with your moderator.
        </p>
      ) : (
        <ul className="game-view-target-list" role="radiogroup" aria-label="Vote target">
          {voteTargets.map((p) => (
            <li key={p.id} className="game-view-target-item">
              <label className="game-view-target-label">
                <input
                  type="radio"
                  name="day-vote-target"
                  className="game-view-target-input"
                  checked={selectedTargetId === p.id}
                  onChange={() => onSelectTarget(p.id)}
                />
                <span className="game-view-target-name">{p.name}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <p className="game-view-hint game-view-vote-hint">
        Who may vote or be voted for can be extended later (e.g. silenced, immune).
      </p>
      <button
        type="button"
        className="game-view-btn"
        disabled={!canSubmit}
        onClick={onSubmitVote}
      >
        Submit vote
      </button>
    </div>
  )
}

type VoteTallyProps = {
  round: number
  roster: PlayerWithRole[]
  votes: VoteRecord[]
  onContinueToNight: () => void
}

export function DayVoteTallyPanel({ round, roster, votes, onContinueToNight }: VoteTallyProps) {
  const byTarget = tallyVotesByTarget(votes)
  const sortedTargets = [...byTarget.entries()].sort((a, b) => b[1] - a[1])

  return (
    <div className="game-view-panel game-view-panel--day game-view-panel--voting">
      <h2 className="game-view-subheading">Vote tally — Day {round}</h2>
      {votes.length === 0 ? (
        <p className="game-view-placeholder">No votes were cast (no eligible voters).</p>
      ) : (
        <>
          <p className="game-view-placeholder">Votes per player:</p>
          <ul className="game-view-day-events game-view-tally-counts">
            {sortedTargets.map(([targetId, count]) => (
              <li key={targetId} className="game-view-day-event">
                <strong>{nameById(roster, targetId)}</strong>: {count}
              </li>
            ))}
          </ul>
          <p className="game-view-placeholder">Each ballot:</p>
          <ul className="game-view-day-events game-view-tally-ballots">
            {votes.map((v, i) => (
              <li key={`${v.voterId}-${v.targetId}-${i}`} className="game-view-day-event">
                {nameById(roster, v.voterId)} → {nameById(roster, v.targetId)}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="game-view-placeholder">
        Elimination from this vote and win checks are not automated yet — resolve at the table, then
        continue when ready.
      </p>
      <button type="button" className="game-view-btn" onClick={onContinueToNight}>
        Continue to night
      </button>
    </div>
  )
}
