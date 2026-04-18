import { useEffect, useRef, useState, type DragEvent } from 'react'
import { moveItem } from './arrayUtils'
import { DragHandleIcon } from './DragHandleIcon'
import { loadPlayers, savePlayers } from './storage'
import type { Player } from './types'
import './PlayersSection.css'

export function PlayersSection() {
  const [players, setPlayers] = useState<Player[]>(loadPlayers)
  const [nameInput, setNameInput] = useState('')
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragFromRef = useRef<number | null>(null)

  useEffect(() => {
    savePlayers(players)
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
    <section className="players-section" aria-labelledby="players-heading">
      <h2 id="players-heading">Players</h2>

      <form
        className="players-add"
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
        <p className="players-empty">No players yet.</p>
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
  )
}
