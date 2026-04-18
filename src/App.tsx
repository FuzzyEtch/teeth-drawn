import { useCallback, useState } from 'react'
import { GameView } from './game/GameView'
import { PreGameView } from './setup/PreGameView'
import './App.css'

function App() {
  const [gameStarted, setGameStarted] = useState(false)

  const handleGameStart = useCallback(() => {
    setGameStarted(true)
  }, [])

  if (gameStarted) {
    return <GameView />
  }

  return <PreGameView onGameStart={handleGameStart} />
}

export default App
