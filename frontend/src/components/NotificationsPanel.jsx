import React, { useEffect, useState, useRef, useCallback } from 'react'
import axios from 'axios'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { useToast } from './Toast'
import { API_BASE_URL } from '../config'
import './NotificationsPanel.css'

const API = `${API_BASE_URL}/notifications`
const PAGE_SIZE = 20

export default function NotificationsPanel() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const offsetRef = useRef(0)
  const observerTarget = useRef(null)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return
    
    try {
      setLoadingMore(true)
      setError('')
      
      const currentOffset = offsetRef.current
      const res = await axios.get(API, {
        params: {
          limit: PAGE_SIZE,
          offset: currentOffset
        }
      })
      
      const newItems = res.data || []
      
      setItems(prevItems => [...prevItems, ...newItems])
      offsetRef.current = currentOffset + newItems.length
      setHasMore(newItems.length === PAGE_SIZE)
    } catch (err) {
      setError(err?.response?.data?.detail || 'خطا در بارگذاری اعلان‌ها')
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, loading, hasMore])

  const load = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true)
        setItems([])
        setHasMore(true)
        offsetRef.current = 0
      }
      setError('')
      
      const currentOffset = reset ? 0 : offsetRef.current
      const res = await axios.get(API, {
        params: {
          limit: PAGE_SIZE,
          offset: currentOffset
        }
      })
      
      const newItems = res.data || []
      
      if (reset) {
        setItems(newItems)
        offsetRef.current = newItems.length
      } else {
        setItems(prev => [...prev, ...newItems])
        offsetRef.current = currentOffset + newItems.length
      }
      
      setHasMore(newItems.length === PAGE_SIZE)
    } catch (err) {
      setError(err?.response?.data?.detail || 'خطا در بارگذاری اعلان‌ها')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Infinite scroll observer
  const lastItemElementRef = useCallback((node) => {
    if (loadingMore || loading) return
    if (observerTarget.current) observerTarget.current.disconnect()
    observerTarget.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        loadMore()
      }
    })
    if (node) observerTarget.current.observe(node)
  }, [loadingMore, hasMore, loading, loadMore])

  useEffect(() => {
    load(true)
  }, [load])

  // Initialize from URL on mount - wait for items to load first
  useEffect(() => {
    if (isInitialized || loading) return
    
    const notificationId = searchParams.get('notificationId')
    if (notificationId) {
      // Find notification in loaded items
      const notif = items.find(n => n.id === parseInt(notificationId))
      if (notif) {
        setSelectedNotification(notif)
      } else if (items.length > 0) {
        // Notification not found in loaded items, clear URL
        setSearchParams({}, { replace: true })
      }
    }
    setIsInitialized(true)
  }, [items, loading, searchParams, isInitialized, setSearchParams])

  // Handle URL changes (browser back/forward)
  useEffect(() => {
    if (!isInitialized) return
    
    const notificationId = searchParams.get('notificationId')
    if (notificationId) {
      const id = parseInt(notificationId)
      const notif = items.find(n => n.id === id)
      if (notif && (!selectedNotification || selectedNotification.id !== id)) {
        setSelectedNotification(notif)
      } else if (!notif && selectedNotification) {
        setSelectedNotification(null)
      }
    } else if (selectedNotification) {
      setSelectedNotification(null)
    }
  }, [searchParams, items, isInitialized, selectedNotification])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && selectedNotification) {
        handleModalClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedNotification])

  const handleMarkAllRead = async () => {
    try {
      await axios.post(`${API}/read-all`)
      await load(true)
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'خطا در بروزرسانی اعلان‌ها')
    }
  }

  const handleItemClick = async (notif) => {
    try {
      if (!notif.is_read) {
        await axios.post(`${API}/${notif.id}/read`)
        // Update local state
        setItems(items.map(item => 
          item.id === notif.id ? { ...item, is_read: true } : item
        ))
      }
    } catch (err) {
      // ignore
    }
    setSelectedNotification(notif)
    // Update URL with notification ID
    setSearchParams({ notificationId: notif.id.toString() }, { replace: true })
  }

  const handleModalClose = () => {
    setSelectedNotification(null)
    // Remove notification ID from URL
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('notificationId')
    setSearchParams(newParams, { replace: true })
  }

  const handleGoToLink = () => {
    if (selectedNotification?.link) {
      navigate(selectedNotification.link)
      setSelectedNotification(null)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    try {
      const date = new Date(dateString)
      return date.toLocaleString('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const getNotificationTypeLabel = (type) => {
    const types = {
      'info': 'اطلاعاتی',
      'success': 'موفقیت',
      'warning': 'هشدار',
      'error': 'خطا',
      'system': 'سیستمی',
    }
    return types[type] || type || '—'
  }

  if (loading) return <div className="notifications-loading">در حال بارگذاری اعلان‌ها...</div>
  if (error) return <div className="notifications-error">{error}</div>

  return (
    <>
      <div className="notifications-panel">
        <div className="notifications-header">
          <h2>اعلان‌ها</h2>
          <div className="notifications-actions">
            <button className="btn-secondary" onClick={() => load(true)}>
              بروزرسانی
            </button>
            <button className="btn-primary" onClick={handleMarkAllRead}>
              علامت‌گذاری همه به‌عنوان خوانده‌شده
            </button>
          </div>
        </div>
        {items.length === 0 && !loading ? (
          <div className="notifications-empty-state">
            <p>اعلانی برای نمایش وجود ندارد.</p>
          </div>
        ) : (
          <div className="notifications-list">
            {items.map((n, index) => (
              <button
                key={n.id}
                ref={index === items.length - 1 ? lastItemElementRef : null}
                className={`notification-item ${n.is_read ? 'read' : 'unread'}`}
                onClick={() => handleItemClick(n)}
              >
                <div className="notification-title-row">
                  <span className="notification-title">{n.title}</span>
                  {!n.is_read && <span className="notification-badge">جدید</span>}
                </div>
                <p className="notification-message">{n.message}</p>
                <span className="notification-time">
                  {formatDate(n.created_at)}
                </span>
              </button>
            ))}
            {loadingMore && (
              <div className="notifications-loading-more">
                <p>در حال بارگذاری اعلان‌های بیشتر...</p>
              </div>
            )}
            {!hasMore && items.length > 0 && (
              <div className="notifications-end-message">
                <p>همه اعلان‌ها نمایش داده شد</p>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedNotification && (
        <div className="notification-modal-overlay" onClick={handleModalClose}>
          <div className="notification-modal" onClick={(e) => e.stopPropagation()}>
            <div className="notification-modal-header">
              <h3 className="notification-modal-title">{selectedNotification.title}</h3>
              <button className="notification-modal-close" onClick={handleModalClose}>
                <X size={20} />
              </button>
            </div>
            <div className="notification-modal-message">
              {selectedNotification.message}
            </div>
            <div className="notification-modal-meta">
              <div className="notification-modal-meta-item">
                <span className="notification-modal-meta-label">نوع:</span>
                <span className="notification-modal-meta-value">
                  {getNotificationTypeLabel(selectedNotification.type)}
                </span>
              </div>
              <div className="notification-modal-meta-item">
                <span className="notification-modal-meta-label">تاریخ:</span>
                <span className="notification-modal-meta-value">
                  {formatDate(selectedNotification.created_at)}
                </span>
              </div>
              <div className="notification-modal-meta-item">
                <span className="notification-modal-meta-label">وضعیت:</span>
                <span className="notification-modal-meta-value">
                  {selectedNotification.is_read ? 'خوانده شده' : 'خوانده نشده'}
                </span>
              </div>
            </div>
            {selectedNotification.link && (
              <div className="notification-modal-actions">
                <button className="btn-secondary" onClick={handleModalClose}>
                  بستن
                </button>
                {/* <button className="btn-primary" onClick={handleGoToLink}>
                  مشاهده جزئیات
                </button> */}
              </div>
            )}
            {!selectedNotification.link && (
              <div className="notification-modal-actions">
                <button className="btn-primary" onClick={handleModalClose}>
                  بستن
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}


