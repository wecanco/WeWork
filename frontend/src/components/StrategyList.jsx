import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { useToast } from './Toast'
import { useConfirm } from './ConfirmModal'
import { useAuth } from './AuthContext'
import StrategyCard from './StrategyCard'
import './StrategyList.css'
import { STRATEGIES_API_BASE_URL } from '../config'

const API_BASE = STRATEGIES_API_BASE_URL
const PAGE_SIZE = 20

function StrategyList({ onSelectStrategy, onBacktest, onHistory, onCreateNew }) {
  const [activeTab, setActiveTab] = useState('mine') // 'mine', 'others', 'public'
  const [strategies, setStrategies] = useState({
    mine: [],
    others: [],
    public: []
  })
  const [loading, setLoading] = useState({
    mine: false,
    others: false,
    public: false
  })
  const [error, setError] = useState({
    mine: null,
    others: null,
    public: null
  })
  const [hasMore, setHasMore] = useState({
    mine: true,
    others: true,
    public: true
  })
  const [skip, setSkip] = useState({
    mine: 0,
    others: 0,
    public: 0
  })
  const [total, setTotal] = useState({
    mine: 0,
    others: 0,
    public: 0
  })
  
  const toast = useToast()
  const confirm = useConfirm()
  const { isAdmin } = useAuth()
  const observerRef = useRef(null)
  const loadingRef = useRef(false)

  // تابع برای بارگذاری استراتژی‌ها
  const loadStrategies = useCallback(async (tab, reset = false) => {
    if (loadingRef.current) return
    
    const currentSkip = reset ? 0 : skip[tab]
    const currentStrategies = reset ? [] : strategies[tab]
    
    // اگر reset نباشد و دیگر آیتمی برای بارگذاری نباشد، برگرد
    if (!reset && !hasMore[tab]) return
    
    try {
      loadingRef.current = true
      setLoading(prev => ({ ...prev, [tab]: true }))
      setError(prev => ({ ...prev, [tab]: null }))
      
      const params = {
        skip: currentSkip,
        limit: PAGE_SIZE,
      }
      
      if (tab === 'mine') {
        params.owner_only = true
      } else if (tab === 'others') {
        // استراتژی‌های دیگران: is_public=true و owner_id IS NOT NULL
        params.owner_only = false
        params.public_only = true
      } else if (tab === 'public') {
        // استراتژی‌های عمومی: is_public=true و owner_id IS NULL
        params.public_only = true
      }
      
      const response = await axios.get(API_BASE, { params })
      const data = response.data
      
      // پشتیبانی از فرمت قدیمی (array) و جدید (object با items)
      const items = Array.isArray(data) ? data : (data.items || [])
      const responseTotal = Array.isArray(data) ? items.length : (data.total || 0)
      
      const newStrategies = reset ? items : [...currentStrategies, ...items]
      const newSkip = currentSkip + items.length
      const newHasMore = items.length === PAGE_SIZE && newSkip < responseTotal
      
      setStrategies(prev => ({ ...prev, [tab]: newStrategies }))
      setSkip(prev => ({ ...prev, [tab]: newSkip }))
      setHasMore(prev => ({ ...prev, [tab]: newHasMore }))
      setTotal(prev => ({ ...prev, [tab]: responseTotal }))
      
    } catch (err) {
      setError(prev => ({ ...prev, [tab]: err?.response?.data?.detail || 'خطا در بارگذاری استراتژی‌ها' }))
      console.error(err)
    } finally {
      setLoading(prev => ({ ...prev, [tab]: false }))
      loadingRef.current = false
    }
  }, [skip, strategies, hasMore])

  // بارگذاری اولیه تب فعال
  useEffect(() => {
    if (strategies[activeTab].length === 0 && !loading[activeTab]) {
      loadStrategies(activeTab, true)
    }
  }, [activeTab])

  // Infinite scroll observer
  const lastElementRef = useCallback((node) => {
    if (loading[activeTab] || loadingRef.current) return
    if (observerRef.current) observerRef.current.disconnect()
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore[activeTab] && !loading[activeTab]) {
        loadStrategies(activeTab, false)
      }
    })
    
    if (node) observerRef.current.observe(node)
  }, [activeTab, loading, hasMore, loadStrategies])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    // اگر تب قبلاً بارگذاری نشده، بارگذاری کن
    if (strategies[tab].length === 0 && !loading[tab]) {
      loadStrategies(tab, true)
    }
  }

  const handleRefresh = () => {
    loadStrategies(activeTab, true)
  }

  const handleDelete = async (id, name, tab) => {
    const confirmed = await confirm(`آیا مطمئن هستید که می‌خواهید استراتژی "${name}" را حذف کنید؟`, {
      title: 'حذف استراتژی',
      type: 'danger'
    })
    if (!confirmed) {
      return
    }
    try {
      await axios.delete(`${API_BASE}/${id}`)
      // حذف از لیست محلی
      setStrategies(prev => ({
        ...prev,
        [tab]: prev[tab].filter(s => s.id !== id)
      }))
      setTotal(prev => ({
        ...prev,
        [tab]: Math.max(0, prev[tab] - 1)
      }))
      toast.success('استراتژی با موفقیت حذف شد')
    } catch (err) {
      const msg = err?.response?.data?.detail || 'خطا در حذف استراتژی'
      toast.error(msg)
      console.error(err)
    }
  }


  const currentStrategies = strategies[activeTab]
  const currentLoading = loading[activeTab]
  const currentError = error[activeTab]
  const currentTotal = total[activeTab]

  return (
    <div className="strategy-list">
      <div className="strategy-list-header">
        <h2>استراتژی‌های ذخیره شده</h2>
        <div className="strategy-list-actions">
          <button className="btn-secondary" onClick={handleRefresh}>
            بروزرسانی
          </button>
          {onCreateNew && (
            <button className="btn-primary" onClick={onCreateNew}>
              ساخت استراتژی جدید
            </button>
          )}
        </div>
      </div>

      {/* تب‌ها */}
      <div className="strategy-tabs">
        <button
          className={`strategy-tab ${activeTab === 'mine' ? 'active' : ''}`}
          onClick={() => handleTabChange('mine')}
        >
          استراتژی‌های من
          {total.mine > 0 && <span className="tab-count">({total.mine})</span>}
        </button>
        <button
          className={`strategy-tab ${activeTab === 'others' ? 'active' : ''}`}
          onClick={() => handleTabChange('others')}
        >
          استراتژی‌های دیگران
          {total.others > 0 && <span className="tab-count">({total.others})</span>}
        </button>
        <button
          className={`strategy-tab ${activeTab === 'public' ? 'active' : ''}`}
          onClick={() => handleTabChange('public')}
        >
          استراتژی‌های عمومی
          {total.public > 0 && <span className="tab-count">({total.public})</span>}
        </button>
      </div>

      {/* محتوای تب فعال */}
      <div className="strategy-tab-content">
        {currentError && (
          <div className="error">{currentError}</div>
        )}
        
        {!currentError && currentStrategies.length === 0 && !currentLoading && (
          <div className="empty-state">
            <p>
              {activeTab === 'mine' && 'هنوز استراتژی شخصی‌ای نساخته‌اید.'}
              {activeTab === 'others' && 'در حال حاضر استراتژی دیگری برای نمایش وجود ندارد.'}
              {activeTab === 'public' && 'در حال حاضر استراتژی عمومی‌ای برای نمایش وجود ندارد.'}
            </p>
            {activeTab === 'mine' && (
              <p>برای ساخت استراتژی جدید، روی "ساخت استراتژی جدید" کلیک کنید.</p>
            )}
          </div>
        )}

        {currentStrategies.length > 0 && (
          <>
            <div className="strategies-grid">
              {currentStrategies.map((strategy) => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  onEdit={onSelectStrategy}
                  onBacktest={onBacktest}
                  onHistory={onHistory}
                  onDelete={(id, name) => handleDelete(id, name, activeTab)}
                  showOwner={activeTab !== 'mine'}
                />
              ))}
            </div>
            
            {/* Infinite scroll trigger */}
            {hasMore[activeTab] && (
              <div ref={lastElementRef} className="scroll-trigger">
                {currentLoading && (
                  <div className="loading-more">در حال بارگذاری بیشتر...</div>
                )}
              </div>
            )}
            
            {!hasMore[activeTab] && currentStrategies.length > 0 && (
              <div className="end-of-list">
                <p>همه استراتژی‌ها نمایش داده شدند ({currentTotal} مورد)</p>
              </div>
            )}
          </>
        )}

        {currentLoading && currentStrategies.length === 0 && (
          <div className="loading">در حال بارگذاری...</div>
        )}
      </div>
    </div>
  )
}

export default StrategyList
