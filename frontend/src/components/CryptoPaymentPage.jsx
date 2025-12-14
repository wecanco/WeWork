import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { AlertTriangle } from 'lucide-react'
import { useToast } from './Toast'
import { API_BASE_URL } from '../config'
import { useAuth } from './AuthContext'
import './CryptoPaymentPage.css'

export default function CryptoPaymentPage() {
  const { paymentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const [paymentData, setPaymentData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [transactionHash, setTransactionHash] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState('pending')

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }
    loadPaymentData()
  }, [paymentId, user])

  useEffect(() => {
    if (!paymentData || !paymentData.expires_at) return

    const updateTimer = () => {
      const now = new Date()
      const expires = new Date(paymentData.expires_at)
      const diff = Math.max(0, Math.floor((expires - now) / 1000))
      setTimeLeft(diff)

      if (diff === 0 && paymentStatus === 'pending') {
        setPaymentStatus('expired')
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [paymentData, paymentStatus])

  const loadPaymentData = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_BASE_URL}/crypto-payment/payment/${paymentId}`)
      setPaymentData(res.data)
      setPaymentStatus(res.data.status)
    } catch (err) {
      setError(err?.response?.data?.detail || 'خطا در بارگذاری اطلاعات پرداخت')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const handleSubmitHash = async (e) => {
    e.preventDefault()
    if (!transactionHash.trim()) {
      toast.warning('لطفاً هش تراکنش را وارد کنید')
      return
    }

    try {
      setSubmitting(true)
      const res = await axios.post(
        `${API_BASE_URL}/crypto-payment/payment/${paymentId}/submit-hash`,
        { transaction_hash: transactionHash.trim() }
      )

      if (res.data.success) {
        if (res.data.status === 'completed') {
          toast.success('پرداخت با موفقیت تایید شد!')
          navigate('/app/strategies')
        } else {
          toast.info(res.data.message)
          setPaymentStatus(res.data.status)
        }
      } else {
        toast.error(res.data.message || 'خطا در تایید تراکنش')
        setPaymentStatus(res.data.status)
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'خطا در ثبت هش تراکنش')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCheckStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/crypto-payment/payment/${paymentId}/status`)
      setPaymentStatus(res.data.status)
      if (res.data.status === 'completed') {
        toast.success('پرداخت با موفقیت تایید شد!')
        navigate('/app/strategies')
      } else if (res.data.status === 'failed') {
        toast.error('پرداخت ناموفق بود. لطفاً دوباره تلاش کنید.')
      }
    } catch (err) {
      console.error('Error checking status:', err)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('کپی شد!')
    })
  }

  if (loading) {
    return <div className="crypto-payment-loading">در حال بارگذاری...</div>
  }

  if (error) {
    return (
      <div className="crypto-payment-error">
        <p>{error}</p>
        <button className="btn-secondary" onClick={() => navigate(-1)}>
          بازگشت
        </button>
      </div>
    )
  }

  if (!paymentData) return null

  const isExpired = timeLeft === 0 && paymentStatus === 'pending'
  const isCompleted = paymentStatus === 'completed'
  const isProcessing = paymentStatus === 'processing'

  return (
    <div className="crypto-payment-page">
      <div className="crypto-payment-container">
        <div className="crypto-payment-header">
          <h2>پرداخت با ارز دیجیتال</h2>
          {!isCompleted && !isExpired && (
            <div className="payment-timer">
              <span className="timer-label">زمان باقی‌مانده:</span>
              <span className={`timer-value ${timeLeft < 60 ? 'timer-warning' : ''}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          )}
        </div>

        <div className="payment-info-card">
          <div className="payment-amount">
            <span className="amount-label">مبلغ قابل پرداخت:</span>
            <span className="amount-value">
              {paymentData.amount_required.toLocaleString('fa-IR')} {paymentData.currency}
            </span>
          </div>

          {isExpired && (
            <div className="payment-status expired">
              <p>زمان پرداخت منقضی شده است.</p>
            </div>
          )}

          {isCompleted && (
            <div className="payment-status completed">
              <p>✅ پرداخت با موفقیت انجام شد!</p>
            </div>
          )}

          {isProcessing && (
            <div className="payment-status processing">
              <p>در حال بررسی تراکنش...</p>
              <button className="btn-check-status" onClick={handleCheckStatus}>
                بررسی مجدد وضعیت
              </button>
            </div>
          )}
        </div>

        {!isCompleted && !isExpired && (
          <>
            <div className="network-selector">
              <label>انتخاب شبکه:</label>
              <select
                value={paymentData.network_name}
                disabled
                className="network-select"
              >
                {paymentData.networks.map((net) => (
                  <option key={net.id} value={net.name}>
                    {net.display_name} (کارمزد: {net.transaction_fee} {paymentData.currency})
                  </option>
                ))}
              </select>
              <p className="network-note">
                شبکه انتخاب شده: <strong>{paymentData.network_display_name}</strong>
              </p>
            </div>

            <div className="wallet-address-section">
              <h3>آدرس ولت برای واریز</h3>
              <div className="address-display">
                <code className="wallet-address">{paymentData.wallet_address}</code>
                <button
                  className="btn-copy"
                  onClick={() => copyToClipboard(paymentData.wallet_address)}
                >
                  کپی
                </button>
              </div>
              {paymentData.wallet_tag && (
                <div className="tag-display">
                  <label>Tag/Memo:</label>
                  <div className="address-display">
                    <code className="wallet-tag">{paymentData.wallet_tag}</code>
                    <button
                      className="btn-copy"
                      onClick={() => copyToClipboard(paymentData.wallet_tag)}
                    >
                      کپی
                    </button>
                  </div>
                </div>
              )}

              <div className="qr-code-container">
                <img
                  src={`data:image/png;base64,${paymentData.qr_code_data}`}
                  alt="QR Code"
                  className="qr-code"
                />
                <p className="qr-note">اسکن کنید یا آدرس را کپی کنید</p>
              </div>
            </div>

            <div className="transaction-hash-section">
              <h3>ثبت هش تراکنش</h3>
              <p className="instruction-text">
                پس از انجام انتقال، هش تراکنش (Transaction Hash) را در زیر وارد کنید:
              </p>
              <form onSubmit={handleSubmitHash}>
                <div className="hash-input-group">
                  <input
                    type="text"
                    value={transactionHash}
                    onChange={(e) => setTransactionHash(e.target.value)}
                    placeholder="0x..."
                    className="hash-input"
                    disabled={submitting || isProcessing}
                  />
                  <button
                    type="submit"
                    className="btn-submit-hash"
                    disabled={submitting || isProcessing || !transactionHash.trim()}
                  >
                    {submitting ? 'در حال بررسی...' : 'ثبت و بررسی'}
                  </button>
                </div>
              </form>
              {isProcessing && (
                <div className="processing-note">
                  <p>تراکنش در حال بررسی است. لطفاً صبر کنید...</p>
                  <button className="btn-check-status" onClick={handleCheckStatus}>
                    بررسی مجدد
                  </button>
                </div>
              )}
            </div>

            <div className="payment-instructions">
              <h3>راهنمای پرداخت:</h3>
              <ol>
                <li>مبلغ {paymentData.amount_required.toLocaleString('fa-IR')} {paymentData.currency} را به آدرس بالا واریز کنید.</li>
                <li>در صورت نیاز، Tag/Memo را نیز وارد کنید.</li>
                <li>پس از انجام انتقال، هش تراکنش را از کیف پول خود کپی کنید.</li>
                <li>هش تراکنش را در فیلد بالا وارد کرده و روی "ثبت و بررسی" کلیک کنید.</li>
                <li>سیستم به صورت خودکار تراکنش را بررسی می‌کند.</li>
              </ol>
              <p className="warning-text">
                <AlertTriangle size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '4px' }} />
                توجه: شما 10 دقیقه فرصت دارید تا پرداخت را انجام دهید.
              </p>
            </div>
          </>
        )}

        <div className="payment-actions">
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            بازگشت
          </button>
        </div>
      </div>
    </div>
  )
}

