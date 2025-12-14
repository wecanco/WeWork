import { useState, useEffect } from 'react'

/**
 * Hook for responsive breakpoints
 * @param {object} breakpoints - Custom breakpoints { sm, md, lg, xl }
 * @returns {object} - { isMobile, isTablet, isDesktop, width }
 */
export const useResponsive = (breakpoints = {}) => {
  const defaultBreakpoints = {
    sm: 640,
    md: 768,
    lg: 960,
    xl: 1280,
    ...breakpoints,
  }

  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 0
  )

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    width,
    isMobile: width < defaultBreakpoints.md,
    isTablet: width >= defaultBreakpoints.md && width < defaultBreakpoints.lg,
    isDesktop: width >= defaultBreakpoints.lg,
    isSmallMobile: width < defaultBreakpoints.sm,
  }
}

export default useResponsive

