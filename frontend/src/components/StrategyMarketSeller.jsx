import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useToast } from './Toast'
import { useConfirm } from './ConfirmModal'
import './StrategyList.css'
import { API_BASE_URL } from '../config'
import { useAuth } from './AuthContext'

const STRATEGY_API = `${API_BASE_URL}/strategies`
const MARKET_API = `${API_BASE_URL}/strategy-market`

export default function StrategyMarketSeller() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()

  const [strategies, setStrategies] = useState([])
  const [listings, setListings] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const [selectedStrategyId, setSelectedStrategyId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('IRR')
  const [isListingModalOpen, setIsListingModalOpen] = useState(false)
  const [editingListing, setEditingListing] = useState(null)

  const preloadStrategyId = searchParams.get('strategyId')

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      const [strategiesRes, listingsRes] = await Promise.all([
        axios.get(STRATEGY_API),
        axios.get(`${MARKET_API}/listings`),
      ])
      const allStrategies = (strategiesRes.data || []).filter((s) => s.is_owner)
      setStrategies(allStrategies)
      setListings(listingsRes.data || [])

      if (preloadStrategyId && allStrategies.length > 0) {
        const found = allStrategies.find((s) => String(s.id) === String(preloadStrategyId))
        if (found) {
          setSelectedStrategyId(String(found.id))
          setTitle(found.name || '')
          setDescription(found.description || '')
        }
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'خطا در بارگذاری اطلاعات بازار استراتژی')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const myListings = listings.filter((l) => user && l.seller_id === user.id)
  const hasActiveListingForSelected =
    selectedStrategyId &&
    myListings.some(
      (l) => String(l.strategy_id) === String(selectedStrategyId) && l.is_active
    )

  const handleSelectStrategy = (strategyId) => {
    setSelectedStrategyId(strategyId)
    if (!strategyId) {
      setTitle('')
      setDescription('')
      return
    }
    const strategy = strategies.find((s) => String(s.id) === String(strategyId))
    if (strategy) {
      setTitle(strategy.name || '')
      setDescription(strategy.description || '')
    }
  }

  const resetFormForCreate = () => {
    if (preloadStrategyId && selectedStrategyId) {
      // اگر از بیلدر آمده، اجازه می‌دهیم همان استراتژی/عنوان پر بماند
    } else {
      setSelectedStrategyId('')
      setTitle('')
      setDescription('')
    }
    setPrice('')
    setCurrency('IRR')
    setCreateError('')
    setEditingListing(null)
  }

  const openCreateModal = () => {
    resetFormForCreate()
    setIsListingModalOpen(true)
  }

  const openEditModal = (listing) => {
    setEditingListing(listing)
    setSelectedStrategyId(String(listing.strategy_id))
    setTitle(listing.title || '')
    setDescription(listing.description || '')
    setPrice(String(listing.price || ''))
    setCurrency(listing.currency || 'IRR')
    setCreateError('')
    setIsListingModalOpen(true)
  }

  const handleListingSubmit = async (e) => {
    e.preventDefault()

    const isEditMode = !!editingListing

    if (!selectedStrategyId && !isEditMode) {
      setCreateError('لطفاً یک استراتژی را انتخاب کنید')
      return
    }

    if (!title.trim()) {
      setCreateError('عنوان آگهی را وارد کنید')
      return
    }

    const numericPrice = parseFloat(price)
    if (!numericPrice || numericPrice <= 0) {
      setCreateError('مبلغ معتبر وارد کنید')
      return
    }

    if (!isEditMode && hasActiveListingForSelected) {
      setCreateError(
        'برای این استراتژی هم‌اکنون یک آگهی فعال دارید. از بخش «آگهی‌های فعال من» آن را ویرایش کنید.'
      )
      return
    }

    try {
      setCreating(true)
      setCreateError('')

      if (isEditMode) {
        const res = await axios.patch(`${MARKET_API}/listings/${editingListing.id}`, {
          title: title.trim(),
          description: description.trim(),
          price: numericPrice,
          currency: currency || 'IRR',
        })
        setListings((prev) => prev.map((l) => (l.id === editingListing.id ? res.data : l)))
        toast.success('آگهی با موفقیت ویرایش شد.')
      } else {
        const res = await axios.post(`${MARKET_API}/listings`, {
          strategy_id: Number(selectedStrategyId),
          title: title.trim(),
          description: description.trim(),
          price: numericPrice,
          currency: currency || 'IRR',
        })
        setListings((prev) => [res.data, ...prev])
        setPrice('')
        if (preloadStrategyId) {
          navigate('/app/strategy-market/sell', { replace: true })
        }
        toast.success('آگهی استراتژی با موفقیت در بازار ثبت شد.')
      }

      setIsListingModalOpen(false)
      setEditingListing(null)
    } catch (err) {
      setCreateError(
        err?.response?.data?.detail ||
          (isEditMode ? 'خطا در ویرایش آگهی استراتژی' : 'خطا در ثبت آگهی استراتژی')
      )
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (listing) => {
    const nextActive = !listing.is_active
    const confirmed = await confirm(
      nextActive
        ? 'این آگهی فعال و برای سایر کاربران قابل مشاهده می‌شود. ادامه می‌دهید؟'
        : 'این آگهی غیرفعال می‌شود و دیگر در بازار نمایش داده نخواهد شد. ادامه می‌دهید؟',
      {
        title: nextActive ? 'فعال‌سازی آگهی' : 'غیرفعال‌سازی آگهی',
        type: 'warning'
      }
    )
    if (!confirmed) {
      return
    }
    try {
      const res = await axios.patch(`${MARKET_API}/listings/${listing.id}`, {
        is_active: nextActive,
      })
      setListings((prev) => prev.map((l) => (l.id === listing.id ? res.data : l)))
      toast.success(nextActive ? 'آگهی با موفقیت فعال شد' : 'آگهی با موفقیت غیرفعال شد')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'خطا در بروزرسانی وضعیت آگهی')
    }
  }

  const handleEditListing = (listing) => {
    openEditModal(listing)
  }

  if (loading) {
    return <div className="loading">در حال بارگذاری اطلاعات بازار استراتژی...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div className="strategy-list">
      <div className="strategy-list-header">
        <div>
          <h2>فروش استراتژی در بازار</h2>
          <p className="strategy-list-subtitle">
            یکی از استراتژی‌های ساخته‌شده خود را انتخاب کنید، قیمت بگذارید و در بازار WT عرضه کنید.
          </p>
        </div>
        <div className="strategy-list-actions">
          <button className="btn-secondary" onClick={loadData}>
            بروزرسانی داده‌ها
          </button>
          <button className="btn-primary" onClick={openCreateModal}>
            ثبت آگهی جدید
          </button>
        </div>
      </div>

      <section className="market-section">
        <h3>آگهی‌های فعال من</h3>
        {myListings.length === 0 ? (
          <div className="empty-state">
            <p>هنوز هیچ استراتژی‌ای را برای فروش در بازار قرار نداده‌اید.</p>
          </div>
        ) : (
          <div className="strategies-grid">
            {myListings.map((listing) => (
              <div
                key={listing.id}
                className={`strategy-card listing-card ${
                  listing.is_active ? 'listing-card-active' : 'listing-card-inactive'
                }`}
              >
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
                      onClick={() => handleEditListing(listing)}
                    >
                      ویرایش آگهی
                    </button>
                    <button
                      className={listing.is_active ? 'btn-secondary' : 'btn-primary'}
                      onClick={() => handleToggleActive(listing)}
                    >
                      {listing.is_active ? 'غیرفعال کردن' : 'فعال کردن'}
                    </button>
                  </div>
                </div>
                <p className="strategy-description">{listing.description}</p>
                <div className="strategy-meta">
                  <span>
                    قیمت: {listing.price.toLocaleString('fa-IR')} {listing.currency}
                  </span>
                  <span className={listing.is_active ? 'text-success' : 'text-danger'}>
                    {listing.is_active ? 'وضعیت: فعال' : 'وضعیت: غیرفعال'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isListingModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsListingModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              type="button"
              onClick={() => setIsListingModalOpen(false)}
            >
              <X size={20} />
            </button>
            <h3 style={{ marginTop: 0, marginBottom: '0.25rem' }}>
              {editingListing ? 'ویرایش آگهی استراتژی' : 'ثبت آگهی جدید'}
            </h3>
            <p className="modal-subtitle">
              {editingListing
                ? 'جزئیات آگهی را ویرایش کنید و پس از ذخیره، تغییرات در بازار اعمال می‌شود.'
                : 'یکی از استراتژی‌های خود را انتخاب کنید، عنوان، توضیحات و قیمت را مشخص کنید.'}
            </p>

            <form className="market-sell-form" onSubmit={handleListingSubmit}>
              {!editingListing && (
                <div className="config-field">
                  <label>انتخاب استراتژی</label>
                  <select
                    value={selectedStrategyId}
                    onChange={(e) => handleSelectStrategy(e.target.value)}
                  >
                    <option value="">یک استراتژی انتخاب کنید</option>
                    {strategies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="config-field">
                <label>عنوان آگهی</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: استراتژی اسکالپ پرنوسان BTC/USDT"
                />
              </div>

              <div className="config-field">
                <label>توضیحات</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="خلاصه‌ای از منطق، تایم‌فریم‌های پیشنهادی، ریسک، و نکات مهم را بنویسید."
                />
              </div>

              <div className="config-row">
                <div className="config-field">
                  <label>مبلغ</label>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="مثال: 500000"
                  />
                </div>
                <div className="config-field">
                  <label>ارز</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    <option value="IRR">ریال (IRR)</option>
                    <option value="USDT">تتر (USDT)</option>
                  </select>
                </div>
              </div>

              {!editingListing && hasActiveListingForSelected && (
                <div className="error-message">
                  برای این استراتژی هم‌اکنون یک آگهی فعال دارید. لطفاً از بخش «آگهی‌های فعال من» آن
                  را ویرایش کنید و از ثبت آگهی تکراری خودداری کنید.
                </div>
              )}

              {createError && <div className="error-message">{createError}</div>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsListingModalOpen(false)}
                >
                  انصراف
                </button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating
                    ? editingListing
                      ? 'در حال ذخیره آگهی...'
                      : 'در حال ثبت آگهی...'
                    : editingListing
                    ? 'ذخیره تغییرات'
                    : 'انتشار در بازار استراتژی'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


