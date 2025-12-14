import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from './Toast'
import './StrategyList.css'
import { API_BASE_URL } from '../config'
import { useAuth } from './AuthContext'
import AuthModal from './AuthModal'

const MARKET_API = `${API_BASE_URL}/strategy-market`

function StrategyCard({ listing, onToggleFavorite, isFavorited, averageRating }) {
  const renderStars = (rating) => {
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)
    return (
      <span className="rating-stars">
        {'★'.repeat(fullStars)}
        {hasHalfStar && '☆'}
        {'☆'.repeat(emptyStars)}
        {rating > 0 && <span className="rating-value">({rating.toFixed(1)})</span>}
      </span>
    )
  }

  return (
    <div className="strategy-card">
      <div className="strategy-card-header">
        <div className="strategy-title-section">
          <h3>{listing.title}</h3>
          {averageRating > 0 && (
            <div className="strategy-rating">
              {renderStars(averageRating)}
            </div>
          )}
        </div>
        <div className="strategy-actions">
          <Link className="btn-details" to={`/strategy-market/${listing.id}`}>
            جزئیات
          </Link>
          <button
            className={`btn-favorite ${isFavorited ? 'favorited' : ''}`}
            onClick={() => onToggleFavorite(listing)}
            title={isFavorited ? 'حذف از علاقه‌مندی' : 'افزودن به علاقه‌مندی'}
          >
            {isFavorited ? '❤️' : '🤍'}
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
  )
}

export default function StrategyMarketplace() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const [listings, setListings] = useState([])
  const [favorites, setFavorites] = useState([])
  const [ratings, setRatings] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAuth, setShowAuth] = useState(false)
  const navigate = useNavigate()

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      const listRes = await axios.get(`${MARKET_API}/listings`)
      const allListings = listRes.data || []
      setListings(allListings)
      
      // Load ratings for all listings
      const ratingsMap = {}
      await Promise.all(
        allListings.map(async (listing) => {
          try {
            const reviewsRes = await axios.get(`${MARKET_API}/listings/${listing.id}/reviews`)
            const reviews = reviewsRes.data || []
            if (reviews.length > 0) {
              const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
              ratingsMap[listing.id] = sum / reviews.length
            } else {
              ratingsMap[listing.id] = 0
            }
          } catch {
            ratingsMap[listing.id] = 0
          }
        })
      )
      setRatings(ratingsMap)
      
      // Try to load favorites if user is logged in
      if (user) {
        try {
          const favRes = await axios.get(`${MARKET_API}/favorites`)
          // Convert to numbers to ensure type consistency
          const favoriteIds = (favRes.data || []).map((f) => Number(f.listing.id))
          setFavorites(favoriteIds)
        } catch (err) {
          // User logged in but favorites failed to load (might be auth issue)
          console.warn('Failed to load favorites:', err)
          setFavorites([])
        }
      } else {
        setFavorites([])
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'خطا در بارگذاری بازار استراتژی')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleToggleFavorite = async (listing) => {
    if (!user) {
      toast.warning('برای افزودن به علاقه‌مندی‌ها باید وارد حساب کاربری شوید.')
      return
    }
    const listingId = Number(listing.id)
    const isFav = favorites.includes(listingId)
    try {
      if (isFav) {
        await axios.delete(`${MARKET_API}/listings/${listingId}/favorite`)
        setFavorites((prev) => prev.filter((id) => id !== listingId))
        toast.success('از علاقه‌مندی‌ها حذف شد')
      } else {
        await axios.post(`${MARKET_API}/listings/${listingId}/favorite`)
        setFavorites((prev) => [...prev, listingId])
        toast.success('به علاقه‌مندی‌ها اضافه شد')
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'خطا در بروزرسانی علاقه‌مندی')
    }
  }

  return (
    <div className="landing-root">
      <header className="landing-header">
        <div className="logo">Wewework</div>
        <nav>
          <button onClick={() => navigate('/strategy-market')}>
            بازار استراتژی
          </button>
          <button onClick={() => navigate('/')}>
            صفحه اصلی
          </button>
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <span className="user-greeting">سلام، {user.full_name || user.email}</span>
              <button className="secondary-btn" onClick={() => navigate('/app')}>
                پنل کاربری
              </button>
              <button className="ghost-btn" onClick={logout}>
                خروج
              </button>
            </>
          ) : (
            <button className="primary-btn" onClick={() => setShowAuth(true)}>
              ورود / ثبت‌نام
            </button>
          )}
        </div>
      </header>

      <main>
        {loading ? (
          <div className="loading">در حال بارگذاری بازار استراتژی...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <div className="strategy-list">
            <div className="strategy-list-header">
              <h2>بازار استراتژی</h2>
              <div className="strategy-list-actions">
                <button className="btn-secondary" onClick={loadData}>
                  بروزرسانی
                </button>
              </div>
            </div>
            {listings.length === 0 ? (
              <div className="empty-state">
                <p>در حال حاضر استراتژی فعالی برای فروش در بازار موجود نیست.</p>
              </div>
            ) : (
              <div className="strategies-grid">
                {listings.map((listing) => (
                  <StrategyCard
                    key={listing.id}
                    listing={listing}
                    isFavorited={favorites.includes(Number(listing.id))}
                    onToggleFavorite={handleToggleFavorite}
                    averageRating={ratings[listing.id] || 0}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  )
}


