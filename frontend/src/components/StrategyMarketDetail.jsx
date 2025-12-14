import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useToast } from './Toast'
import { useConfirm } from './ConfirmModal'
import './StrategyList.css'
import './BacktestPanel.css'
import { API_BASE_URL } from '../config'
import { useAuth } from './AuthContext'

const MARKET_API = `${API_BASE_URL}/strategy-market`
const STRATEGY_API = `${API_BASE_URL}/strategies`

export default function StrategyMarketDetail() {
  const { user } = useAuth()
  const { listingId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const [listing, setListing] = useState(null)
  const [reviews, setReviews] = useState([])
  const [myRating, setMyRating] = useState(5)
  const [myComment, setMyComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [purchasing, setPurchasing] = useState(false)
  const [purchase, setPurchase] = useState(null)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

  // Backtest state
  const [symbol, setSymbol] = useState('BTC/USDT')
  const [timeframe, setTimeframe] = useState('5m')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [initialCapital, setInitialCapital] = useState(1000)
  const [positionSizingType, setPositionSizingType] = useState('percentage')
  const [positionSizeValue, setPositionSizeValue] = useState(10)
  const [useCompound, setUseCompound] = useState(true)
  const [feePercent, setFeePercent] = useState(0.05)
  const [leverage, setLeverage] = useState(10)
  const [marginType, setMarginType] = useState('isolated')
  const [running, setRunning] = useState(false)
  const [backtestResult, setBacktestResult] = useState(null)
  const [backtestError, setBacktestError] = useState(null)
  const [jobId, setJobId] = useState(null)
  const [jobStatus, setJobStatus] = useState(null)

  const timeframes = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d']

  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const getMaxDateTime = () => {
    const now = new Date()
    return formatDateTimeLocal(now)
  }
  const maxDateTime = getMaxDateTime()

  useEffect(() => {
    if (startDate || endDate) return
    const now = new Date()
    const end = new Date(now)
    end.setDate(end.getDate() - 1)
    end.setHours(23, 59, 59, 0) // Set to 23:59:00
    const start = new Date(end)
    start.setDate(start.getDate() - 7)
    start.setHours(0, 0, 0, 0) // Set to 00:00:00
    setStartDate(formatDateTimeLocal(start))
    setEndDate(formatDateTimeLocal(end))
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      const [listingRes, reviewsRes] = await Promise.all([
        axios.get(`${MARKET_API}/listings/${listingId}`),
        axios.get(`${MARKET_API}/listings/${listingId}/reviews`).catch(() => ({ data: [] })),
      ])
      setListing(listingRes.data)
      setReviews(reviewsRes.data || [])
      
      // Try to load purchase info if user is logged in
      if (user) {
        try {
          const purchasesRes = await axios.get(`${MARKET_API}/purchases/me`)
          const myPurchase = (purchasesRes.data || []).find(
            (p) => String(p.listing_id) === String(listingId)
          )
          setPurchase(myPurchase || null)
        } catch {
          // User not logged in or error, purchase will be null
          setPurchase(null)
        }
      } else {
        setPurchase(null)
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'خطا در بارگذاری جزئیات استراتژی')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [listingId])

  const handlePurchase = async () => {
    if (!user) {
      toast.warning('برای خرید استراتژی باید وارد حساب کاربری شوید.')
      return
    }
    const confirmed = await confirm('آیا از خرید این استراتژی مطمئن هستید؟', {
      title: 'تایید خرید استراتژی',
      type: 'info'
    })
    if (!confirmed) return
    try {
      setPurchasing(true)
      // Use crypto payment instead of Zarinpal
      const res = await axios.post(`${API_BASE_URL}/crypto-payment/checkout`, {
        listing_id: Number(listingId),
      })
      // Redirect to crypto payment page
      navigate(res.data.payment_url)
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'خطا در شروع پرداخت استراتژی')
    } finally {
      setPurchasing(false)
    }
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!user) {
      toast.warning('برای ثبت نظر باید وارد حساب کاربری شوید.')
      return
    }
    try {
      setReviewSubmitting(true)
      await axios.post(`${MARKET_API}/listings/${listingId}/reviews`, {
        rating: Number(myRating),
        comment: myComment || null,
      })
      setMyComment('')
      await loadData()
      toast.success('نظر شما با موفقیت ثبت شد')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'خطا در ثبت نظر')
    } finally {
      setReviewSubmitting(false)
    }
  }

  const handleRunBacktest = async () => {
    if (!user) {
      toast.warning('برای اجرای بک تست باید وارد حساب کاربری شوید.')
      return
    }
    if (!startDate || !endDate) {
      toast.warning('لطفا تاریخ شروع و پایان را وارد کنید')
      return
    }
    const start = new Date(startDate)
    const end = new Date(endDate)
    const now = new Date()
    if (start > now) {
      toast.warning('تاریخ شروع نمی‌تواند در آینده باشد')
      return
    }
    if (end > now) {
      toast.warning('تاریخ پایان نمی‌تواند در آینده باشد')
      return
    }
    if (end <= start) {
      toast.warning('تاریخ پایان باید بعد از تاریخ شروع باشد')
      return
    }

    setRunning(true)
    setBacktestError(null)
    setBacktestResult(null)
    setJobId(null)
    setJobStatus(null)

    try {
      const res = await axios.post(`${MARKET_API}/listings/${listingId}/backtests`, {
        strategy_id: listing.strategy_id,
        symbol,
        timeframe,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        initial_capital: parseFloat(initialCapital),
        position_sizing_type: positionSizingType,
        position_size_value: parseFloat(positionSizeValue),
        use_compound: useCompound,
        fee_percent: parseFloat(feePercent),
        leverage: parseInt(leverage, 10) || 1,
        margin_type: marginType,
      })
      setJobId(res.data.job_id)
      setJobStatus('pending')
    } catch (err) {
      setBacktestError(err?.response?.data?.detail || 'خطا در شروع بک تست')
      setRunning(false)
    }
  }

  useEffect(() => {
    if (!jobId) return
    const interval = setInterval(async () => {
      try {
        const statusRes = await axios.get(`${STRATEGY_API}/backtest/jobs/${jobId}`)
        const status = statusRes.data.status
        setJobStatus(status)
        if (status === 'completed') {
          clearInterval(interval)
          setRunning(false)
          try {
            const resultRes = await axios.get(`${STRATEGY_API}/backtest/jobs/${jobId}/result`)
            setBacktestResult(resultRes.data)
          } catch (err) {
            setBacktestError('خطا در دریافت نتیجه بک تست')
          }
        } else if (status === 'failed') {
          clearInterval(interval)
          setRunning(false)
          setBacktestError(statusRes.data.error || 'بک تست با خطا مواجه شد')
        }
      } catch (err) {
        // ignore polling error
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [jobId])

  const prepareChartData = () => {
    if (!backtestResult || !backtestResult.trades) return []
    let cumulativePnl = 0
    return backtestResult.trades.map((trade, index) => {
      cumulativePnl += trade.pnl_percent_leveraged
      return {
        trade: index + 1,
        pnl: trade.pnl_percent_leveraged,
        cumulative: cumulativePnl,
      }
    })
  }

  if (loading) return <div className="loading">در حال بارگذاری...</div>
  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button className="btn-secondary" onClick={() => navigate(-1)}>
          بازگشت
        </button>
      </div>
    )
  }
  if (!listing) return null

  const hasUpdate = purchase?.has_update

  const averageRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0

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
    <div className="backtest-panel">
      <div className="backtest-header">
        <button onClick={() => navigate(-1)} className="btn-back">
          ← بازگشت
        </button>
        <div className="detail-title-section">
          <h2>{listing.title}</h2>
          {averageRating > 0 && (
            <div className="detail-rating">
              {renderStars(averageRating)}
              <span className="rating-count">({reviews.length} نظر)</span>
            </div>
          )}
        </div>
      </div>

      <div className="strategy-market-detail">
        <section className="market-section">
          <div className="detail-header-info">
            <div className="strategy-meta">
              <span>سازنده: {listing.seller_name || 'نامشخص'}</span>
              <span>
                قیمت: {listing.price.toLocaleString('fa-IR')} {listing.currency}
              </span>
            </div>
            <div className="strategy-actions">
              {purchase ? (
                <>
                  <span className="badge-success">شما این استراتژی را خریداری کرده‌اید</span>
                  {hasUpdate && (
                    <span className="badge-warning">نسخه جدید این استراتژی در دسترس است.</span>
                  )}
                </>
              ) : (
                <button className="btn-primary" disabled={purchasing} onClick={handlePurchase}>
                  {purchasing ? 'در حال ثبت خرید...' : 'خرید استراتژی'}
                </button>
              )}
            </div>
          </div>
          <h3>توضیحات</h3>
          <p className="detail-description">{listing.description}</p>
        </section>

        <section className="market-section">
          <h3>بک تست روی این استراتژی</h3>
          <div className="backtest-config">
            <div className="config-row">
              <div className="config-field">
                <label>نماد (Symbol)</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="BTC/USDT"
                />
              </div>
              <div className="config-field">
                <label>تایم فریم</label>
                <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                  {timeframes.map((tf) => (
                    <option key={tf} value={tf}>
                      {tf}
                    </option>
                  ))}
                </select>
              </div>
              <div className="config-field">
                <label>لوریج (x)</label>
                <input
                  type="number"
                  value={leverage}
                  onChange={(e) => setLeverage(e.target.value)}
                  min="1"
                  max="1000"
                  step="1"
                />
              </div>
              <div className="config-field">
                <label>تاریخ شروع</label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={maxDateTime}
                />
              </div>
              <div className="config-field">
                <label>تاریخ پایان</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  max={maxDateTime}
                  min={startDate || undefined}
                />
              </div>
              <div className="config-field">
                <label>سرمایه اولیه (USDT)</label>
                <input
                  type="number"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(e.target.value)}
                  min="1"
                  step="0.01"
                />
              </div>

            </div>
            <div className="config-row">
            <div className="config-field">
                <label>نوع سایز معامله</label>
                <select
                  value={positionSizingType}
                  onChange={(e) => setPositionSizingType(e.target.value)}
                >
                  <option value="percentage">درصد سرمایه</option>
                  <option value="fixed">مقدار ثابت (USDT)</option>
                </select>
              </div>
              <div className="config-field">
                <label>
                  {positionSizingType === 'percentage'
                    ? 'درصد سرمایه در هر معامله'
                    : 'مقدار ثابت در هر معامله (USDT)'}
                </label>
                <input
                  type="number"
                  value={positionSizeValue}
                  onChange={(e) => setPositionSizeValue(e.target.value)}
                  min="0.01"
                  step="0.01"
                />
              </div>
            <div className="config-field">
                <label>نوع مارجین</label>
                <select value={marginType} onChange={(e) => setMarginType(e.target.value)}>
                  <option value="isolated">Isolated (ایزوله)</option>
                  <option value="cross">Cross (کراس)</option>
                </select>
                <div style={{ marginTop: '4px', fontSize: '0.85em', color: '#666' }}>
                  {marginType === 'isolated' 
                    ? 'ایزوله: مارجین فقط برای این پوزیشن استفاده می‌شود' 
                    : 'کراس: مارجین بین تمام پوزیشن‌ها مشترک است'}
                </div>
              </div>
              
            </div>
            <div className="config-row">
              
              <div className="config-field">
                <label>کارمزد صرافی (%)</label>
                <input
                  type="number"
                  value={feePercent}
                  onChange={(e) => setFeePercent(e.target.value)}
                  min="0"
                  max="1"
                  step="0.01"
                />
              </div>
              <div className="config-field">
                <label>استفاده از سود ترکیبی</label>
                <label>
                  <input
                    type="checkbox"
                    checked={useCompound}
                    onChange={(e) => setUseCompound(e.target.checked)}
                  />
                  {' '} بله
                </label>
              </div>

            </div>
            <div className="config-row">
              
            </div>
            <button
              className="btn-run-backtest"
              disabled={running}
              onClick={handleRunBacktest}
            >
              {running ? 'در حال اجرای بک تست...' : 'اجرای بک تست'}
            </button>
            {jobId && (
              <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
                Job ID: {jobId.substring(0, 8)}... | Status: {jobStatus || 'pending'}
              </div>
            )}
            {backtestError && <div className="error-message">{backtestError}</div>}
          </div>

          {backtestResult && (
            <div className="backtest-results">
              <h3>خلاصه نتایج بک تست</h3>
              <div className="results-summary">
                <div className="summary-card">
                  <div className="summary-label">تعداد معاملات</div>
                  <div className="summary-value">{backtestResult.total_trades}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">برد</div>
                  <div className="summary-value success">{backtestResult.wins}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">باخت</div>
                  <div className="summary-value danger">{backtestResult.losses}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">نرخ برد</div>
                  <div className="summary-value">{backtestResult.win_rate.toFixed(2)}%</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">سود/زیان خالص</div>
                  <div
                    className={`summary-value ${
                      backtestResult.net_pnl_percent >= 0 ? 'success' : 'danger'
                    }`}
                  >
                    {backtestResult.net_pnl_percent.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="market-section">
          <h3>ریویوها</h3>
          {reviews.length === 0 ? (
            <p>هنوز ریویویی ثبت نشده است.</p>
          ) : (
            <div className="reviews-list">
              {reviews.map((r) => (
                <div key={r.id} className="review-item">
                  <div className="review-header">
                    <strong>{r.user_name || 'کاربر'}</strong>
                    <span>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  </div>
                  {r.comment && <p className="review-comment">{r.comment}</p>}
                  {r.reply && (
                    <div className="review-reply">
                      <strong>پاسخ سازنده:</strong>
                      <p>{r.reply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {purchase && (
            <form className="review-form" onSubmit={handleSubmitReview}>
              <h4>نظر شما درباره این استراتژی</h4>
              <label>
                امتیاز (۱ تا ۵)
                <select
                  value={myRating}
                  onChange={(e) => setMyRating(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                توضیح (اختیاری)
                <textarea
                  value={myComment}
                  onChange={(e) => setMyComment(e.target.value)}
                  placeholder="تجربه‌تان از این استراتژی را بنویسید..."
                />
              </label>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={reviewSubmitting}
              >
                {reviewSubmitting ? 'در حال ثبت...' : 'ثبت نظر'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}


