import { useEffect, useRef, useCallback } from 'react'

/**
 * Hook for infinite scroll functionality
 * @param {function} loadMore - Function to load more data
 * @param {boolean} hasMore - Whether there's more data to load
 * @param {boolean} loading - Loading state
 * @param {object} options - { threshold: number, rootMargin: string }
 */
export const useInfiniteScroll = (
  loadMore,
  hasMore,
  loading,
  options = {}
) => {
  const { threshold = 0.1, rootMargin = '100px' } = options
  const observerRef = useRef(null)
  const loadingRef = useRef(false)

  const lastElementRef = useCallback(
    (node) => {
      if (loading || loadingRef.current) return
      if (observerRef.current) observerRef.current.disconnect()

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loading && !loadingRef.current) {
            loadingRef.current = true
            loadMore().finally(() => {
              loadingRef.current = false
            })
          }
        },
        { threshold, rootMargin }
      )

      if (node) observerRef.current.observe(node)
    },
    [loadMore, hasMore, loading, threshold, rootMargin]
  )

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  return { lastElementRef }
}

export default useInfiniteScroll

