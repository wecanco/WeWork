import { useState, useCallback, useRef } from 'react'

export function useHistory(initialState) {
  const [history, setHistory] = useState([initialState])
  const [historyIndex, setHistoryIndex] = useState(0)
  const historyRef = useRef({ history: [initialState], index: 0 })

  const push = useCallback((newState) => {
    setHistory((prevHistory) => {
      const currentIndex = historyRef.current.index
      // Remove any future history if we're not at the end
      const newHistory = prevHistory.slice(0, currentIndex + 1)
      newHistory.push(newState)
      
      // Limit history to 50 states
      let newIndex = newHistory.length - 1
      if (newHistory.length > 50) {
        newHistory.shift()
        newIndex = 49
      }
      
      historyRef.current = { history: newHistory, index: newIndex }
      setHistoryIndex(newIndex)
      return newHistory
    })
  }, [])

  const undo = useCallback(() => {
    setHistoryIndex((prevIndex) => {
      if (prevIndex > 0) {
        const newIndex = prevIndex - 1
        historyRef.current.index = newIndex
        return newIndex
      }
      return prevIndex
    })
    
    const newIndex = historyRef.current.index > 0 ? historyRef.current.index - 1 : historyRef.current.index
    historyRef.current.index = newIndex
    
    return historyRef.current.index > 0 
      ? historyRef.current.history[historyRef.current.index - 1]
      : historyRef.current.history[0]
  }, [])

  const redo = useCallback(() => {
    setHistoryIndex((prevIndex) => {
      const maxIndex = historyRef.current.history.length - 1
      if (prevIndex < maxIndex) {
        const newIndex = prevIndex + 1
        historyRef.current.index = newIndex
        return newIndex
      }
      return prevIndex
    })
    
    const maxIndex = historyRef.current.history.length - 1
    const newIndex = historyRef.current.index < maxIndex 
      ? historyRef.current.index + 1 
      : historyRef.current.index
    historyRef.current.index = newIndex
    
    return historyRef.current.index < historyRef.current.history.length - 1
      ? historyRef.current.history[historyRef.current.index + 1]
      : historyRef.current.history[historyRef.current.index]
  }, [])

  // Sync ref with state
  const currentState = history[historyIndex]
  if (historyRef.current.history !== history) {
    historyRef.current.history = history
  }
  if (historyRef.current.index !== historyIndex) {
    historyRef.current.index = historyIndex
  }

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  return {
    currentState,
    push,
    undo,
    redo,
    canUndo,
    canRedo,
  }
}
