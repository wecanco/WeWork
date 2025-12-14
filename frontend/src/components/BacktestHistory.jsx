import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { toPersianDateTime } from '../utils/dateUtils'
import { useToast } from './Toast'
import { useConfirm } from './ConfirmModal'
import './BacktestHistory.css'
import { STRATEGIES_API_BASE_URL } from '../config'

const API_BASE = STRATEGIES_API_BASE_URL
const LIMIT = 15

function BacktestHistory({ strategyId, onSelectBacktest }) {
  const [backtests, setBacktests] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const observerTarget = useRef(null)
  const toast = useToast()
  const confirm = useConfirm()

  const fetchBacktests = useCallback(async (currentOffset = 0, isInitial = false) => {
    if (!strategyId) return
    
    try {
      if (isInitial) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      
      const response = await axios.get(`${API_BASE}/backtest/results`, {
        params: { 
          strategy_id: strategyId, 
          limit: LIMIT,
          offset: currentOffset
        }
      })
      
      const newBacktests = response.data
      
      if (isInitial) {
        setBacktests(newBacktests)
      } else {
        setBacktests(prev => [...prev, ...newBacktests])
      }
      
      // Check if there's more data
      if (newBacktests.length < LIMIT) {
        setHasMore(false)
      } else {
        setHasMore(true)
      }
      
      setError(null)
    } catch (err) {
      console.error('Error fetching backtests:', err)
      setError('خطا در دریافت تاریخچه بک‌تست‌ها')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [strategyId])

  useEffect(() => {
    if (strategyId) {
      // Reset state when strategyId changes
      setBacktests([])
      setOffset(0)
      setHasMore(true)
      fetchBacktests(0, true)
    }
  }, [strategyId, fetchBacktests])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    
    setOffset(prevOffset => {
      const newOffset = prevOffset + LIMIT
      fetchBacktests(newOffset, false)
      return newOffset
    })
  }, [loadingMore, hasMore, fetchBacktests])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [loadMore, hasMore, loadingMore])

  const handleDelete = async (backtestId, e) => {
    e.stopPropagation()
    const confirmed = await confirm('آیا مطمئن هستید که می‌خواهید این بک‌تست را حذف کنید؟', {
      title: 'حذف بک‌تست',
      type: 'danger'
    })
    if (!confirmed) {
      return
    }

    try {
      await axios.delete(`${API_BASE}/backtest/results/${backtestId}`)
      setBacktests(backtests.filter(b => b.id !== backtestId))
      toast.success('بک‌تست با موفقیت حذف شد')
      // Adjust offset if needed
      if (backtests.length === offset + LIMIT && offset > 0) {
        setOffset(prev => Math.max(0, prev - LIMIT))
      }
    } catch (err) {
      console.error('Error deleting backtest:', err)
      toast.error('خطا در حذف بک‌تست')
    }
  }

  const handleBacktestClick = (backtest) => {
    if (onSelectBacktest) {
      onSelectBacktest(backtest)
    }
  }

  if (loading) {
    return (
      <div className="backtest-history">
        <div className="loading">در حال بارگذاری...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="backtest-history">
        <div className="error">{error}</div>
      </div>
    )
  }

  return (
    <div className="backtest-history">
      <div className="backtest-history-header">
        <h3>تاریخچه بک‌تست‌ها</h3>
        <button onClick={() => {
          setBacktests([])
          setOffset(0)
          setHasMore(true)
          fetchBacktests(0, true)
        }} className="btn-refresh">
           بروزرسانی
        </button>
      </div>

      {backtests.length === 0 && !loading ? (
        <div className="empty-state">
          <p>هنوز بک‌تستی برای این استراتژی اجرا نشده است.</p>
        </div>
      ) : (
        <div className="backtest-list">
          {backtests.map((backtest) => (
            <div
              key={backtest.id}
              className="backtest-item"
              onClick={() => handleBacktestClick(backtest)}
            >
              <div className="backtest-item-header">
                <div className="backtest-symbol">
                  {backtest.symbol} - {backtest.timeframe}
                </div>
                <div className="backtest-date">
                  {toPersianDateTime(backtest.created_at)}
                </div>
                <button
                  className="btn-delete-backtest"
                  onClick={(e) => handleDelete(backtest.id, e)}
                  title="حذف بک‌تست"
                >
                  🗑️
                </button>
              </div>

              <div className="backtest-item-body">
                <div className="backtest-period">
                  <span className="label">بازه زمانی:</span>
                  <span>{toPersianDateTime(backtest.start_date)}</span>
                  <span>تا</span>
                  <span>{toPersianDateTime(backtest.end_date)}</span>
                </div>

                <div className="backtest-stats">
                  <div className="stat-item">
                    <span className="stat-label">تعداد معاملات:</span>
                    <span className="stat-value">{backtest.total_trades}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">نرخ برد:</span>
                    <span className={`stat-value ${backtest.win_rate >= 50 ? 'positive' : 'negative'}`}>
                      {backtest.win_rate.toFixed(2)}%
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">برد:</span>
                    <span className="stat-value positive">{backtest.wins}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">باخت:</span>
                    <span className="stat-value negative">{backtest.losses}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">سود/زیان:</span>
                    <span className={`stat-value ${backtest.net_pnl_percent >= 0 ? 'positive' : 'negative'}`}>
                      {backtest.net_pnl_percent.toFixed(2)}%
                    </span>
                  </div>
                  {backtest.net_pnl_percent_leveraged !== backtest.net_pnl_percent && (
                    <div className="stat-item">
                      <span className="stat-label">سود/زیان (با اهرم):</span>
                      <span className={`stat-value ${backtest.net_pnl_percent_leveraged >= 0 ? 'positive' : 'negative'}`}>
                        {backtest.net_pnl_percent_leveraged.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {/* Infinite scroll trigger and loading indicator */}
          {hasMore && (
            <div ref={observerTarget} className="infinite-scroll-trigger">
              {loadingMore && (
                <div className="loading-more">در حال بارگذاری بیشتر...</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BacktestHistory

