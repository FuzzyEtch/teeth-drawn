/**
 * Records something that happened during the night. `publicNextDay` controls whether
 * it appears in the public day announcement list.
 */
export type NightEvent = {
  id: string
  kind: string
  summary: string
  publicNextDay: boolean
  meta?: {
    targetPlayerId?: string
  }
}

export function createEliminationNightEvent(
  targetPlayerId: string,
  targetName: string,
  options?: { publicNextDay?: boolean },
): NightEvent {
  const publicNextDay = options?.publicNextDay ?? true
  return {
    id: crypto.randomUUID(),
    kind: 'elimination',
    summary: `${targetName} was eliminated last night.`,
    publicNextDay,
    meta: { targetPlayerId },
  }
}

export function publicNightAnnouncements(events: NightEvent[]): NightEvent[] {
  return events.filter((e) => e.publicNextDay)
}
