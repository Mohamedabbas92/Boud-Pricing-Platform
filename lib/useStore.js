import { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_KEY = 'boud_platform_v1'

const defaultState = {
  projects:   [],
  vendorsDB:  [],
  toolsDB:    [],
  savedProps: [],
  roster:     [],
  pTools:     [],
  pVendors:   [],
  pName:      '',
  pClient:    '',
  pOh:        '0.25',
  pProfit:    30,
  pRisk:      10,
  pDiscount:  0,
}

export function useStore() {
  const [state, setState] = useState(defaultState)
  const [loaded, setLoaded] = useState(false)
  const saveTimer = useRef(null)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setState({ ...defaultState, ...JSON.parse(raw) })
    } catch {}
    setLoaded(true)
  }, [])

  // Auto-save debounced
  const save = useCallback((newState, silent = false) => {
    const merged = { ...state, ...newState }
    setState(merged)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)) } catch {}
    }, 800)
  }, [state])

  const saveNow = useCallback((newState) => {
    const merged = { ...state, ...(newState || {}) }
    setState(merged)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)) } catch {}
  }, [state])

  return { state, save, saveNow, loaded }
}
