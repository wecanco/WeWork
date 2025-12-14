import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from './AuthContext'
import { API_BASE_URL } from '../config'
import AuthModal from './AuthModal'

export default function PricingBuilder({ onRequireLogin }) {
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [planSelection, setPlanSelection] = useState('')
  const [maxStrategies, setMaxStrategies] = useState(1)
  const [maxBacktests, setMaxBacktests] = useState(10)
  const [prioritySupport, setPrioritySupport] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [price, setPrice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/billing/plans`)
      .then((res) => {
        setPlans(res.data)
        if (res.data.length > 0) {
          const defaultPlan = res.data.find((p) => p.is_default) || res.data[0]
          setSelectedPlanId(defaultPlan.id)
          setPlanSelection(String(defaultPlan.id))
          const baseFeatures = defaultPlan.features || {}
          setMaxStrategies(baseFeatures.max_strategies || 1)
          setMaxBacktests(baseFeatures.max_backtests_per_day || 10)
          setPrioritySupport(Boolean(baseFeatures.priority_support))
        }
      })
      .catch(() => {
        // ignore for landing demo
      })
  }, [])

  const refreshPrice = async () => {
    if (!selectedPlanId) return
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API_BASE_URL}/billing/plans/preview`, {
        base_plan_id: selectedPlanId,
        custom_features: {
          max_strategies: maxStrategies,
          max_backtests_per_day: maxBacktests,
          priority_support: prioritySupport,
        },
      })
      setPrice(res.data.final_price)
    } catch (err) {
      setError('خطا در محاسبه قیمت')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshPrice()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlanId, maxStrategies, maxBacktests, prioritySupport])

  useEffect(() => {
    if (!planSelection || planSelection === 'custom') return
    const selectedPlan = plans.find((plan) => plan.id === Number(planSelection))
    if (!selectedPlan) return
    setSelectedPlanId(selectedPlan.id)
    const baseFeatures = selectedPlan.features || {}
    setMaxStrategies(baseFeatures.max_strategies || 1)
    setMaxBacktests(baseFeatures.max_backtests_per_day || 10)
    setPrioritySupport(Boolean(baseFeatures.priority_support))
  }, [planSelection, plans])

  const markCustomSelection = () => {
    if (planSelection !== 'custom') {
      setPlanSelection('custom')
    }
  }

  const handleCheckout = async () => {
    if (!user) {
      setError('برای خرید اشتراک ابتدا وارد حساب کاربری شوید.')
      onRequireLogin?.()
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API_BASE_URL}/billing/checkout/zarinpal`, {
        base_plan_id: selectedPlanId,
        custom_features: {
          max_strategies: maxStrategies,
          max_backtests_per_day: maxBacktests,
          priority_support: prioritySupport,
        },
      })
      window.location.href = res.data.start_pay_url
    } catch (err) {
      setError(err?.response?.data?.detail || 'خطا در شروع پرداخت')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pricing-builder">
      <div className="pricing-controls">
        <div className="form-group">
          <label>انتخاب پلن پایه</label>
          <select
            value={planSelection}
            onChange={(e) => {
              const value = e.target.value
              if (value === 'custom') {
                setPlanSelection('custom')
                return
              }
              setPlanSelection(value)
            }}
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} - {p.base_price.toLocaleString('fa-IR')} تومان
              </option>
            ))}
            <option value="custom">پلن سفارشی</option>
          </select>
        </div>

        <div className="slider-group">
          <label>
            تعداد استراتژی‌های فعال: <strong>{maxStrategies}</strong>
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={maxStrategies}
            onChange={(e) => {
              markCustomSelection()
              setMaxStrategies(Number(e.target.value))
            }}
          />
        </div>

        <div className="slider-group">
          <label>
            حداکثر بک‌تست در روز: <strong>{maxBacktests}</strong>
          </label>
          <input
            type="range"
            min="10"
            max="200"
            step="10"
            value={maxBacktests}
            onChange={(e) => {
              markCustomSelection()
              setMaxBacktests(Number(e.target.value))
            }}
          />
        </div>

        <div className="toggle-group">
          <label>
            <input
              type="checkbox"
              checked={prioritySupport}
              className="ml-2"
              onChange={(e) => {
                markCustomSelection()
                setPrioritySupport(e.target.checked)
              }}
            /> 
            پشتیبانی اولویت‌دار
          </label>
        </div>
      </div>

      <div className="pricing-summary">
        <h3>خلاصه پلن شخصی‌سازی شده</h3>
        <ul>
          <li>حداکثر استراتژی فعال: {maxStrategies}</li>
          <li>حداکثر بک‌تست روزانه: {maxBacktests}</li>
          <li>پشتیبانی: {prioritySupport ? 'اولویت‌دار' : 'معمولی'}</li>
        </ul>
        <div className="price-display">
          {loading ? 'در حال محاسبه...' : price !== null ? `${price.toLocaleString('fa-IR')} تومان / ماه` : '—'}
        </div>
        {!user && (
          <div className="warning-text">
            لطفاً ابتدا وارد حساب کاربری شوید تا بتوانید اشتراک تهیه کنید.
          </div>
        )}
        <button
          className="primary-btn"
          onClick={() => (user ? handleCheckout() : setShowAuth(true))}
          disabled={loading || price === 0}
        >
          {user ? 'پرداخت و تهیه اشتراک' : 'ثبت نام و تهیه اشتراک'}
        </button>
        {error && <div className="error-text">{error}</div>}
        <div className="note">
        </div>
      </div>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  )
}


