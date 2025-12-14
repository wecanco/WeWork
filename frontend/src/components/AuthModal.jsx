import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from './AuthContext'

export default function AuthModal({ onClose }) {
  const { requestOtp, verifyOtp } = useAuth()
  const [step, setStep] = useState('phone') // phone | verify
  const [phoneNumber, setPhoneNumber] = useState('')
  const [code, setCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    let timer
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const result = await requestOtp(phoneNumber)
      setIsNewUser(!!result?.is_new_user)
      setStep('verify')
      setInfo('کد تایید برای شما ارسال شد. لطفاً ظرف ۵ دقیقه وارد کنید.')
      setCooldown(60)
    } catch (err) {
      setError(err?.response?.data?.detail || 'خطا در ارسال پیامک. دوباره تلاش کنید.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    if (isNewUser && !fullName.trim()) {
      setError('لطفاً نام و نام خانوادگی خود را وارد کنید.')
      return
    }
    setLoading(true)
    try {
      await verifyOtp(phoneNumber, code, fullName)
      onClose?.()
    } catch (err) {
      setError(err?.response?.data?.detail || 'کد وارد شده معتبر نیست.')
    } finally {
      setLoading(false)
    }
  }

  const resetFlow = () => {
    setStep('phone')
    setCode('')
    setFullName('')
    setIsNewUser(false)
    setError('')
    setInfo('')
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <h2>ورود / ثبت‌نام</h2>
        <p className="modal-subtitle">
        </p>

        {step === 'phone' && (
          <form onSubmit={handleRequestOtp} className="auth-form">
            <div className="form-group">
              <label>شماره موبایل</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="مثلاً 09120000000"
                // pattern="09\\d{9}"
                required
              />
            </div>
            {error && <div className="error-text">{error}</div>}
            {info && <div className="info-text">{info}</div>}
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? 'در حال ارسال...' : 'ارسال کد تایید'}
            </button>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerifyOtp} className="auth-form">
            {isNewUser && (
              <div className="form-group">
                <label>نام و نام خانوادگی</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="لطفاً نام کامل خود را وارد کنید"
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label>کد تایید ارسال شده</label>
              <input
                type="tel"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="کد ۶ رقمی"
                // pattern="\\d{4,6}"
                required
              />
            </div>
            {error && <div className="error-text">{error}</div>}
            {info && <div className="info-text">{info}</div>}
            <div className="auth-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={resetFlow}
              >
                اصلاح شماره
              </button>
              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? 'در حال ورود...' : 'ورود به حساب'}
              </button>
            </div>
            <button
              type="button"
              className="resend-btn"
              onClick={handleRequestOtp}
              disabled={cooldown > 0 || loading}
            >
              {cooldown > 0 ? `ارسال مجدد در ${cooldown}s` : 'ارسال دوباره کد'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
