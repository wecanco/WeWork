import React from 'react'
import axios from 'axios'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../config'

const statusLabels = {
  paid: 'پرداخت شده',
  failed: 'ناموفق',
  pending: 'در انتظار',
}

function PaymentResult({ variant }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const paymentId = searchParams.get('payment_id')
  const queryMessage = searchParams.get('message')
  const queryRefId = searchParams.get('ref_id')
  const resultStatus = searchParams.get('status') || (variant === 'success' ? 'paid' : 'failed')

  const [payment, setPayment] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (!paymentId) {
      return
    }
    let cancelled = false
    const fetchPayment = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await axios.get(`${API_BASE_URL}/billing/payments/${paymentId}`)
        if (!cancelled) {
          setPayment(res.data)
        }
      } catch (err) {
        if (!cancelled) {
          const detail =
            err?.response?.status === 401
              ? 'برای مشاهده جزئیات پرداخت ابتدا وارد حساب کاربری خود شوید.'
              : err?.response?.data?.detail || 'خطا در دریافت جزئیات پرداخت'
          setError(detail)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchPayment()
    return () => {
      cancelled = true
    }
  }, [paymentId])

  const isSuccess = variant === 'success'
  const resolvedRefId = payment?.ref_id || queryRefId
  const heading = isSuccess ? 'پرداخت با موفقیت انجام شد' : 'پرداخت ناموفق بود'
  const description =
    queryMessage ||
    (isSuccess ? 'سرویس زرین‌پال پرداخت شما را تایید کرد.' : 'پرداخت لغو یا تایید نشد.')

  const goToPayments = () => {
    navigate('/app/subscription#payments')
  }

  const goToDashboard = () => {
    navigate(isSuccess ? '/app/strategies' : '/')
  }

  return (
    <div className="payment-result-page">
      <div className={`payment-result-card ${isSuccess ? 'success' : 'failure'}`}>
        <div className="payment-result-status">
          <span className="payment-result-badge">{isSuccess ? 'موفق' : 'ناموفق'}</span>
          <h1>{heading}</h1>
          <p>{description}</p>
        </div>

        {paymentId && (
          <div className="payment-info">
            <h3>اطلاعات پرداخت</h3>
            {loading && <p>در حال دریافت اطلاعات پرداخت...</p>}
            {!loading && error && <p className="error-text">{error}</p>}
            {!loading && !error && (
              <div className="payment-info-grid">
                <div>
                  <span>شناسه پرداخت</span>
                  <strong>{paymentId}</strong>
                </div>
                <div>
                  <span>وضعیت</span>
                  <strong>{statusLabels[payment?.status] || statusLabels[resultStatus] || '—'}</strong>
                </div>
                <div>
                  <span>مبلغ</span>
                  <strong>
                    {payment && typeof payment.amount === 'number'
                      ? `${payment.amount.toLocaleString('fa-IR')} ${payment.currency || 'IRR'}`
                      : '—'}
                  </strong>
                </div>
                <div>
                  <span>تاریخ</span>
                  <strong>
                    {payment?.paid_at
                      ? new Date(payment.paid_at).toLocaleString('fa-IR')
                      : payment?.created_at
                      ? new Date(payment.created_at).toLocaleString('fa-IR')
                      : '—'}
                  </strong>
                </div>
                <div>
                  <span>کد پیگیری زرین‌پال</span>
                  <strong>{resolvedRefId || '—'}</strong>
                </div>
                <div>
                  <span>پلن</span>
                  <strong>{payment?.plan_name || '—'}</strong>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="payment-result-actions">
          <button className="primary-btn" onClick={goToPayments}>
            مشاهده بخش پرداخت‌ها
          </button>
          <button className="ghost-btn" onClick={goToDashboard}>
            بازگشت به {isSuccess ? 'پنل کاربری' : 'صفحه اصلی'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PaymentResult

