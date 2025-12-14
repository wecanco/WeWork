/* global __APP_VERSION__ */
import { useEffect, useState } from 'react'

const VERSION_STORAGE_KEY = 'wt_app_version'

const resolveVersion = () => {
  if (typeof __APP_VERSION__ !== 'undefined') {
    return __APP_VERSION__
  }
  return import.meta.env.VITE_APP_VERSION || 'dev'
}

export function useAppVersion() {
  const [isUpdated, setIsUpdated] = useState(false)
  const version = resolveVersion()

  useEffect(() => {
    const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY)
    if (storedVersion !== version) {
      localStorage.setItem(VERSION_STORAGE_KEY, version)
      if (storedVersion) {
        setIsUpdated(true)
      }
    }
  }, [version])

  return { version, isUpdated }
}


