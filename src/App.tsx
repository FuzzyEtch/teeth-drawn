import { useEffect, useRef, useState, type DragEvent } from 'react'
import './App.css'

/** `id` is for stable list identity (reorder, React keys); only `name` is shown in UI. */
export type Player = { name: string; id: string }

const STORAGE_KEY = 'werewolf-tabletop-players'

function parsePlayer(raw: unknown): Player | null {
  if (typeof raw !== 'object' || raw === null || !('name' in raw)) return null
  const name = (raw as { name: unknown }).name
  if (typeof name !== 'string') return null
  const idRaw = (raw as { id?: unknown }).id
  const id =
    typeof idRaw === 'string' && idRaw.length > 0
      ? idRaw
      : crypto.randomUUID()
  return { name, id }
}

function loadPlayers(): Player[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const list = parsed
      .map((p) => parsePlayer(p))
      .filter((p): p is Player => p !== null)
    // Ensure unique ids (migrate old saves / duplicates)
    const seen = new Set<string>()
    return list.map((p) => {
      let id = p.id
      if (seen.has(id)) id = crypto.randomUUID()
      seen.add(id)
      return { ...p, id }
    })
  } catch {
    return []
  }
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to) return items
  const next = [...items]
  const [removed] = next.splice(from, 1)
  next.splice(to, 0, removed)
  return next
}

function DragHandleIcon() {
  return (
    <svg
      className="drag-handle-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden
    >
      <path
        d="M2 4h12M2 8h12M2 12h12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function App() {
  const [players, setPlayers] = useState<Player[]>(loadPlayers)
  const [nameInput, setNameInput] = useState('')
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragFromRef = useRef<number | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players))
  }, [players])

  function addPlayer() {
    const name = nameInput.trim()
    if (!name) return
    setPlayers((prev) => [...prev, { name, id: crypto.randomUUID() }])
    setNameInput('')
  }

  function removePlayer(index: number) {
    setPlayers((prev) => prev.filter((_, i) => i !== index))
  }

  function handleDragStart(index: number) {
    dragFromRef.current = index
    setDragSourceIndex(index)
  }

  function handleDragEnd() {
    dragFromRef.current = null
    setDragSourceIndex(null)
    setDragOverIndex(null)
  }

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragFromRef.current === null) return
    setDragOverIndex(index)
  }

  function handleDrop(e: DragEvent, targetIndex: number) {
    e.preventDefault()
    const from = dragFromRef.current
    if (from === null) return
    setPlayers((prev) => moveItem(prev, from, targetIndex))
    handleDragEnd()
  }

  return (
    <div className="home">
      <h1>Werewolf Tabletop</h1>

      <section className="home-players" aria-labelledby="players-heading">
        <h2 id="players-heading">Players</h2>

        <form
          className="home-add"
          onSubmit={(e) => {
            e.preventDefault()
            addPlayer()
          }}
        >
          <label className="sr-only" htmlFor="player-name">
            Player name
          </label>
          <input
            id="player-name"
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Name"
            autoComplete="off"
            maxLength={120}
          />
          <button type="submit" className="btn btn-primary">
            Add player
          </button>
        </form>

        {players.length === 0 ? (
          <p className="home-empty">No players yet.</p>
        ) : (
          <ol className="player-list">
            {players.map((player, index) => (
              <li
                key={player.id}
                className={[
                  'player-row',
                  dragSourceIndex === index ? 'player-row--dragging' : '',
                  dragOverIndex === index ? 'player-row--over' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
              >
                <button
                  type="button"
                  className="drag-handle"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', String(index))
                    handleDragStart(index)
                  }}
                  onDragEnd={handleDragEnd}
                  aria-label={`Reorder ${player.name}`}
                >
                  <DragHandleIcon />
                </button>
                <span className="player-name">{player.name}</span>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => removePlayer(index)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

export default App
