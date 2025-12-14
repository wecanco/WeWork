import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useToast } from './Toast'
import { useConfirm } from './ConfirmModal'
import './StrategyList.css'
import { API_BASE_URL } from '../config'
import { useNavigate } from 'react-router-dom'

const MARKET_API = `${API_BASE_URL}/strategy-market`

export default function FavoriteStrategies() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()

  const loadFavorites = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await axios.get(`${MARKET_API}/favorites`)
      setItems(res.data || [])
    } catch (err) {
      setError(err?.response?.data?.detail || 'خطا در بارگذاری استراتژی‌های مورد پسند')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFavorites()
  }, [])

  const handleRemove = async (listingId, title) => {
    const confirmed = await confirm(`آیا از حذف «${title}» از علاقه‌مندی‌ها مطمئن هستید؟`, {
      title: 'حذف از علاقه‌مندی‌ها',
      type: 'warning'
    })
    if (!confirmed) return
    try {
      await axios.delete(`${MARKET_API}/listings/${listingId}/favorite`)
      setItems((prev) => prev.filter((f) => f.listing.id !== listingId))
      toast.success('از علاقه‌مندی‌ها حذف شد')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'خطا در حذف از علاقه‌مندی')
    }
  }

  if (loading) return <div className="loading">در حال بارگذاری...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="strategy-list">
      <div className="strategy-list-header">
        <h2>استراتژی‌های مورد پسند من</h2>
        <div className="strategy-list-actions">
          <button className="btn-secondary" onClick={loadFavorites}>
            بروزرسانی
          </button>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="empty-state">
          <p>هنوز استراتژی‌ای را به علاقه‌مندی‌ها اضافه نکرده‌اید.</p>
        </div>
      ) : (
        <div className="strategies-grid">
          {items.map(({ listing }) => (
            <div key={listing.id} className="strategy-card">
              <div className="strategy-card-header">
                <h3>{listing.title}</h3>
                <div className="strategy-actions">
                  <button
                    className="btn-backtest"
                    onClick={() => navigate(`/strategy-market/${listing.id}`)}
                  >
                    مشاهده در بازار
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => handleRemove(listing.id, listing.title)}
                  >
                    حذف از علاقه‌مندی
                  </button>
                </div>
              </div>
              <p className="strategy-description">{listing.description}</p>
              <div className="strategy-meta">
                <span>سازنده: {listing.seller_name || 'نامشخص'}</span>
                <span>
                  قیمت: {listing.price.toLocaleString('fa-IR')} {listing.currency}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


