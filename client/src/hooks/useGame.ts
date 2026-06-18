import { useEffect, useRef, useState } from 'react'
import socket from '../socket'
import type { AppState, PlayerSymbol, GameState } from '../types'

export const useGame = () => {
  const [appState, setAppState] = useState<AppState>('idle')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [mySymbol, setMySymbol] = useState<PlayerSymbol | null>(null)
  const [opponentName, setOpponentName] = useState<string | null>(null)
  const myNameRef = useRef('')

  useEffect(() => {
    socket.on('waiting', () => {
      setAppState('waiting')
    })

    socket.on(
      'start',
      ({ state, symbol, opponentName: oName }: { state: GameState; symbol: PlayerSymbol; opponentName: string }) => {
        setGameState(state)
        setMySymbol(symbol)
        setOpponentName(oName)
        setAppState('playing')
      }
    )

    socket.on('update', (state: GameState) => {
      setGameState(state)
      if (state.gameOver) setAppState('finished')
    })

    socket.on('opponent_left', () => {
      setGameState(null)
      setMySymbol(null)
      setOpponentName(null)
      setAppState('waiting')
      socket.emit('join', { name: myNameRef.current })
    })

    socket.on('disconnect', () => {
      setGameState(null)
      setMySymbol(null)
      setOpponentName(null)
      setAppState('idle')
    })

    return () => {
      socket.off('waiting')
      socket.off('start')
      socket.off('update')
      socket.off('opponent_left')
      socket.off('disconnect')
    }
  }, [])

  const joinGame = (name: string) => {
    myNameRef.current = name
    socket.emit('join', { name })
  }

  const handleMove = (index: number) => {
    const isMyTurn = gameState?.currentTurn === mySymbol
    const canMove = appState === 'playing' && isMyTurn && !gameState?.gameOver

    if (canMove) {
      socket.emit('move', index)
    }
  }

  return { gameState, appState, mySymbol, opponentName, joinGame, handleMove }
}
